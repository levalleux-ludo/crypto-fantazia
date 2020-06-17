import smartpy as sp

def call(c, x):
    sp.transfer(x, sp.mutez(0), c)

class FakeTokenContract(sp.Contract):
    def __init__(self, admin):
        self.init(paused = False, balances = sp.big_map(tvalue = sp.TRecord(approvals = sp.TMap(sp.TAddress, sp.TNat), balance = sp.TNat)), admin = admin, totalSupply = 0, lastCaller = sp.address('tz1MTzrRsQLdUxLYZz6WnAnMBEx9B8v8rurG'))

    @sp.entry_point
    def setAdministrator(self, params):
        sp.verify(sp.sender == self.data.admin)
        self.data.admin = params.admin

    @sp.entry_point
    def mint(self, params):
        # Pb with SmartPY ? (do not occur wit hdev version https://smartpy.io/dev/index.html)
        sp.verify(sp.sender == self.data.admin)
        self.addAddressIfNecessary(params.to)
        self.data.balances[params.to].balance += params.value
        self.data.totalSupply += params.value
    
    @sp.entry_point
    def setCaller(self):
        self.data.lastCaller = sp.sender

    @sp.entry_point
    def setCallerAdminOnly(self):
        sp.verify(sp.sender == self.data.admin)
        self.data.lastCaller = sp.sender

    @sp.entry_point
    def burn(self, params):
        sp.verify(sp.sender == self.data.admin)
        sp.verify(self.data.balances[params.address].balance >= params.amount)
        self.data.balances[params.address].balance = sp.as_nat(self.data.balances[params.address].balance - params.amount)
        self.data.totalSupply = sp.as_nat(self.data.totalSupply - params.amount)
    
    @sp.entry_point
    def transfer(self, params):
        sp.verify((sp.sender == self.data.admin) |
            (~self.data.paused &
                ((params.f == sp.sender) |
                 (self.data.balances[params.f].approvals[sp.sender] >= params.amount))))
        self.addAddressIfNecessary(params.t)
        sp.verify(self.data.balances[params.f].balance >= params.amount)
        self.data.balances[params.f].balance = sp.as_nat(self.data.balances[params.f].balance - params.amount)
        self.data.balances[params.t].balance += params.amount
        sp.if (params.f != sp.sender) & (self.data.admin != sp.sender):
            self.data.balances[params.f].approvals[sp.sender] = sp.as_nat(self.data.balances[params.f].approvals[sp.sender] - params.amount)

    @sp.entry_point
    def getBalance(self, params):
        sp.transfer(self.data.balances[params.arg.owner].balance, sp.tez(0), sp.contract(sp.TNat, params.target).open_some())

    @sp.entry_point
    def resetBalance(self, params):
        sp.verify(sp.sender == self.data.admin)
        sp.if self.data.balances.contains(params.address):
            self.data.totalSupply = sp.as_nat(self.data.totalSupply - self.data.balances[params.address].balance)
            del self.data.balances[params.address]

    def addAddressIfNecessary(self, address):
        sp.if ~ self.data.balances.contains(address):
            self.data.balances[address] = sp.record(balance = 0, approvals = {})

class GameContract(sp.Contract):
    def __init__(self, originator_address, originator_pubKey, creator_address):
        # TODO: add data structure for quarantine
        # TODO: add currentLap counter
        self.init(
            originator_address = originator_address,
            originator_pubKey = originator_pubKey,
            creator = creator_address,
            players = {},
            playersSet = sp.set(),
            status = 'created',
            nextPlayer = originator_address,
            nextPlayerIdx = -1,
            nextDices = -1,
            debug = 0,
            alreadyRegistered = False,
#            randoms = {},
#            playerPositions = sp.map(),
            counter = 0)
    
    @sp.entry_point
    def register(self, params):
        sp.verify(self.data.status == 'created', 'Registering only allowed when game is in created state')
        self.data.alreadyRegistered = self.data.playersSet.contains(sp.sender)
        sp.verify(self.data.playersSet.contains(sp.sender) == False, 'User already registered')
        sp.set_type(params.random, sp.TInt)
        sp.set_type(params.signature, sp.TSignature)
        nbPlayers = sp.to_int(sp.len(self.data.players))
        self.data.players[nbPlayers] = sp.sender
        self.data.playersSet.add(sp.sender)

    @sp.entry_point
    def start(self, params):
        sp.verify(self.data.status == 'created', 'Start only allowed when game is in created state')
        sp.verify(sp.sender == self.data.originator_address, 'Only originator is allowed to start game')
        sp.set_type(params.token, sp.TAddress)
        sp.set_type(params.initialBalance, sp.TIntOrNat)
        self.data.status = 'started'
        self.findNextPlayer()
        #self.giveInitialBalance(params.token, params.initialBalance)
        self.giveInitialBalance(params.token)
        
    @sp.entry_point
    def reset(self, params):
        sp.verify(sp.sender == self.data.originator_address, 'Only originator is allowed to reset game')
        self.data.status = 'created'
        self.data.nextPlayerIdx = -1
        self.data.nextPlayer = self.data.originator_address
        self.resetInitialBalance(params.token)
    
    @sp.entry_point
    def end(self, params):
        sp.verify((self.data.status == 'started') | (self.data.status == 'frozen'), 'End only allowed when game is in started or frozen state')
        sp.verify(sp.sender == self.data.creator, 'Only game creator is allowed to end game')
        self.data.status = 'ended'

    @sp.entry_point
    def freeze(self, params):
        sp.verify(self.data.status == 'started', 'Freeze only allowed when game is in started state')
        sp.verify(sp.sender == self.data.creator, 'Only game creator is allowed to freeze game')
        self.data.status = 'frozen'

    @sp.entry_point
    def resume(self, params):
        sp.verify(self.data.status == 'frozen', 'Resume only allowed when game is in frozen state')
        sp.verify(sp.sender == self.data.creator, 'Only game creator is allowed to resume game')
        self.data.status = 'started'

    @sp.entry_point
    def play(self, params):
        sp.verify(self.data.status == 'started', 'Play only allowed when game is in started state')
        sp.verify(self.data.nextPlayer == sp.sender, 'Only the next player is allowed to play now')
        # TODO: verify signature and payload match
        # TODO: verify that option chosen by the player is listed in payload
        # TODO: distribute PoW rewards (dice1) to MINING_FARM owners according to their hashrate
        # call mining contract REWARD(dice1) -> compute reward % numLap -> compute reward[ownerX] = reward * hashrateX / totalHashrate -> token.mint(rewardX, ownerX)
        # TODO: distribute PoS rewards (dice2)  to BAKERY owners according to their stakes
        # call bakery contract REWARD(dice1) -> compute reward % numLap -> compute reward[ownerX] = reward * stakeX / totalStake -> token.mint(rewardX, ownerX)
        # TODO: apply OPTION:
        # if GENESIS: call token.mint(player, 200)
        # if COVID: if player owns immunity passport, do nothing, else move player position to quarantine + set player in quarantine mode until lap = currentLap+1
        # if QUARANTINE: do nothing
        # if ASSET BUY: call asset.transfer(assetId, player) --> token.transfer(price, newOwner -> oldOwner) or token.burn() if no oldOwner
        # if ASSET PAY RENT: call asset.rent(assetId, player) --> token.transfer(asset.rentRate * owner_prorata, asset.owner) + for each shareholder token.transfer(asset.rentRate * share_prorata, shareholder)
        # if CHANCE/COMMUNITY_CHEST:
        #   receive_amount (N)  -> token.mint(N, player)
        #   pay_amount (N) -> token.burn(N, player)
        #   pay_amount_per_company (N) -> asset.getAssets(owner).count -> token.burn(N*count, player)
        #   pay_amount_per_mining_farm (N) -> asset.getAssets(owner, type=MINING_FARM).count -> token.burn(N*count, player)
        #   pay_amount_per_bakery (N) -> asset.getAssets(owner, type=BAKERY).count -> token.burn(N*count, player)
        #   go_to_quarantine: same COVID
        #   go_to_space (X) -> player.position = X, if X < oldPosition, token.mint(200, player)
        #   move_n_spaces (X) -> player.position += X, if newPosition >= nbSpaces, newPosition -= nbSpaces, token.mint(200, player)
        #   covid_immunity -> player.hasImmunity = true
        self.findNextPlayer()

    # TODO: contracts calls outside of play:
    # SALE ASSET on MARKETPLACE: call marketplace contract SALE(price, asset) --> onSales.add(asset)
    # BUY ASSET on MARKETPLACE: call marketplace contract BUY(price, asset) --> token.transfer(price newOwner -> oldOwner) + token.mint(10%, marketplace.owner)--> asset.owner = newOwner
    # ASSET.INVEST: call asset contract INVEST(asset) -> token.brun(investCost, player)--> asset.investLevel++, compute new rentRate 
    # ASSET.IEO: call exchange contract LAUNCH_IEO(asset, token_price) --> onSales(asset, nbTokens)
    # ASSET.BUY_TOKEN: call exchange contract BUY_TOKEN(asset) --> token.transfer(token_price, asset.owner) + token.mint(10% exchange owner) --> asset.shareHolder.add (player), set owner_prorata--
    # MINING_FARM.INVEST: call mining contract UPGRADE(assetId) -> token.burn(cost, player) -> hashrate[assetId]++, totalHashrate++
    # BAKERY.STAKE: call bakery contract STAKE(assetId) -> token.burn(cost, player) -> stake[assetId]++, totalStake++

    @sp.entry_point
    def setCreator(self, params):
        sp.set_type(params.creator_address, sp.TAddress)
        sp.verify((sp.sender == self.data.originator_address) | (sp.sender == self.data.creator), 'Only originator or actual creator is allowed to change creator')
        self.data.creator = params.creator_address
        
    @sp.entry_point
    def testCallToken(self, params):
        sp.set_type(params.token, sp.TAddress)
        # h_setCaller: handle to the 'setCaller' entry_point of the token contract
        h_setCaller = sp.contract(sp.TUnit, params.token, entry_point = "setCaller").open_some()
        param = sp.unit
        call(h_setCaller, param)

    @sp.entry_point
    def testCallTokenAdminOnly(self, params):
        sp.set_type(params.token, sp.TAddress)
        # h_setCaller: handle to the 'setCallerAdminOnly' entry_point of the token contract
        h_setCaller = sp.contract(sp.TUnit, params.token, entry_point = "setCallerAdminOnly").open_some()
        param = sp.unit
        call(h_setCaller, param)

    def findNextPlayer(self):
        nbPlayers = sp.to_int(sp.len(self.data.players))
        self.data.nextPlayerIdx = sp.to_int((self.data.nextPlayerIdx + 1) % nbPlayers)
        # TODO: replace modulo with test if >= nbPlayers, then increment numLap
        # TODO: check if nextPlayer in Quarantine, then if lapUntil >= numLap call findNextPlayer again, else remove player from quarantine 
        self.data.nextPlayer = self.data.players[self.data.nextPlayerIdx]
        
    #def giveInitialBalance(self, token, initialBalance):
    def giveInitialBalance(self, token):
        # tk : type of params expected by 'mint' entry_point
        tk = sp.TRecord(to = sp.TAddress, value = sp.TNat)
        # h_mint: handle to the 'mint' entry_point of the token contract
        h_mint = sp.contract(tk, token, entry_point = "mint").open_some()
        sp.for player in self.data.playersSet.elements():
            param = sp.record(to = player, value = 1500)
            call(h_mint, param)

    def resetInitialBalance(self, token):
        # tk : type of params expected by 'resetBalance' entry_point
        tk = sp.TRecord(address = sp.TAddress)
        # h_resetBalance: handle to the 'resetBalance' entry_point of the token contract
        h_resetBalance = sp.contract(tk, token, entry_point = "resetBalance").open_some()
        sp.for player in self.data.playersSet.elements():
            param = sp.record(address = player)
            call(h_resetBalance, param)


@sp.add_test(name = "GameContract Test")
def test():
    scenario = sp.test_scenario()
    scenario.h1("Simple GameContract test")
    
    # Initialize test variables
    
    originator   = sp.test_account('God')
    alice   = sp.test_account('Alice')
    bob   = sp.test_account('Robert')
    charlie = sp.test_account('Charlie')

    contract = GameContract(originator.address, originator.public_key, alice.address)
    
    scenario += contract
    
    scenario.verify(contract.data.creator == alice.address)

    token = FakeTokenContract(contract.address)
    
    scenario += token
    
    scenario.verify(token.data.admin == contract.address)
    
    scenario += contract.setCreator(creator_address = bob.address).run(sender = originator)
    scenario.verify(contract.data.creator == bob.address)
    scenario += contract.setCreator(creator_address = alice.address).run(sender = bob)
    scenario.verify(contract.data.creator == alice.address)
    
    scenario.h2("Test register alice")
    randomValue = 123456789
    thingToSign = sp.pack(sp.record(n = randomValue, c = contract.data.counter))
    signature = sp.make_signature(originator.secret_key, thingToSign)
    scenario += contract.register(random = randomValue, signature = signature).run(sender = alice)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 1)

    scenario.h2("Test register bob")
    randomValue = 987654321
    thingToSign = sp.pack(sp.record(n = randomValue, c = contract.data.counter))
    signature = sp.make_signature(originator.secret_key, thingToSign)
    scenario += contract.register(random = randomValue, signature = signature).run(sender = bob)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 2)

    scenario.h2("Test register alice again (expect to fail)")
    randomValue = 543219876
    thingToSign = sp.pack(sp.record(n = randomValue, c = contract.data.counter))
    signature = sp.make_signature(originator.secret_key, thingToSign)
    scenario += contract.register(random = randomValue, signature = signature).run(sender = alice, valid = False)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 2)
    
    scenario.verify(token.data.admin == contract.address)
    scenario.verify(token.data.totalSupply == 0)
    
    scenario.h2("Test play on not started game (expect to fail)")
    scenario += contract.play().run (sender = alice, valid = False)
    
    scenario.h2("Test start game from unauthorized user (expect to fail)")
    scenario += contract.start(token = token.address, initialBalance = 1500).run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')

    scenario.h2("Test start game")
    scenario += contract.start(token = token.address, initialBalance = 1500).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayerIdx == 0)
    scenario.verify(contract.data.nextPlayer == alice.address)
    
    scenario.verify(token.data.totalSupply == 3000)
    scenario += token

    scenario.h2("Reset game")
    scenario += contract.reset(token = token.address).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')
    
    scenario.verify(token.data.balances.contains(alice.address) == False)
    scenario.verify(token.data.balances.contains(bob.address) == False)
    scenario.verify(token.data.totalSupply == 0)
    scenario += token

    scenario.h2("Start game again")
    scenario += contract.start(token = token.address, initialBalance = 0).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayerIdx == 0)
    scenario.verify(contract.data.nextPlayer == alice.address)

    scenario.verify(token.data.balances[alice.address].balance == 1500)
    scenario.verify(token.data.balances[bob.address].balance == 1500)
    scenario.verify(token.data.totalSupply == 3000)
    scenario += token
    
    scenario.h2("Test register after game started (expect to fail)")
    randomValue = 543219876
    thingToSign = sp.pack(sp.record(n = randomValue, c = contract.data.counter))
    signature = sp.make_signature(originator.secret_key, thingToSign)
    scenario += contract.register(random = randomValue, signature = signature).run(sender = charlie, valid = False)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 2)

    scenario.h2("Test freeze game from unauthorized user (expect to fail)")
    scenario += contract.freeze().run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')

    scenario.h2("Test freeze game")
    scenario += contract.freeze().run(sender = alice)
    # Verify expected results
    scenario.verify(contract.data.status == 'frozen')
    
    scenario.h2("Test play on frozen game (expect to fail)")
    scenario += contract.play().run (sender = alice, valid = False)

    scenario.h2("Test resume game from unauthorized user (expect to fail)")
    scenario += contract.resume().run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'frozen')

    scenario.h2("Test resume game")
    scenario += contract.resume().run(sender = alice)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    
    scenario.h2("Test play from Alice")
    scenario += contract.play().run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)

    scenario.h2("Test play from Alice again (expect to fail)")
    scenario += contract.play().run (sender = alice, valid = False)
    scenario.verify(contract.data.nextPlayer == bob.address)

    scenario.h2("Test play from Bob")
    scenario += contract.play().run (sender = bob)
    scenario.verify(contract.data.nextPlayer == alice.address)

    scenario.h2("Test play from Bob again (expect to fail)")
    scenario += contract.play().run (sender = bob, valid = False)
    scenario.verify(contract.data.nextPlayer == alice.address)

    scenario.h2("Test end game from unauthorized user (expect to fail)")
    scenario += contract.end().run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')

    scenario.h2("Test end game")
    scenario += contract.end().run(sender = alice)
    # Verify expected results
    scenario.verify(contract.data.status == 'ended')
    
    scenario.h2("Test play on ended game (expect to fail)")
    scenario += contract.play().run (sender = alice, valid = False)
    
    scenario.verify(token.data.lastCaller != alice.address)
    scenario += token.setCaller().run(sender = alice)
    scenario.verify(token.data.lastCaller == alice.address)
    
    scenario += contract.testCallToken(token = token.address).run(sender = bob)
    scenario += token
    scenario.verify(token.data.lastCaller == contract.address)
    
    scenario += contract.testCallTokenAdminOnly(token = token.address).run(sender = bob)
    scenario += token
    scenario.verify(token.data.lastCaller == contract.address)
    
