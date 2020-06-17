import smartpy as sp

def call(c, x):
    sp.transfer(x, sp.mutez(0), c)


######################### TOKEN ###################################

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

######################### CHANCE/COMMUNITY CONTRACT ###################################

class ChanceContract(sp.Contract):
    def __init__(self, admin, chances):
        self.init(
            admin = admin,
            chances = chances,
            gameContract = admin,
            tokenContract = admin
        )
    
    @sp.entry_point
    def setGameContract(self, params):
        self.data.gameContract = params.address
    
    @sp.entry_point
    def setTokenContract(self, params):
        self.data.tokenContract = params.address
    
    @sp.entry_point
    def perform(self, params):
        chance = self.data.chances[params.chanceId]
        sp.if chance.type == 'receive_amount':
            # tk : type of params expected by 'receive_amount' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt)
            # h_receive_amount: handle to the 'receive_amount' entry_point of the GamedContract
            h_receive_amount = sp.contract(tk, self.data.gameContract, entry_point = "receive_amount").open_some()
            param = sp.record(player = params.player, value = chance.param)
            call(h_receive_amount, param)            
        sp.if chance.type == 'pay_amount':
            # tk : type of params expected by 'pay_amount' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt)
            # h_pay_amount: handle to the 'pay_amount' entry_point of the GamedContract
            h_pay_amount = sp.contract(tk, self.data.gameContract, entry_point = "pay_amount").open_some()
            param = sp.record(player = params.player, value = chance.param)
            call(h_pay_amount, param)
        sp.if chance.type == 'go_to_space':
            # tk : type of params expected by 'go_to_space' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt)
            # h_go_to_space: handle to the 'go_to_space' entry_point of the GamedContract
            h_go_to_space = sp.contract(tk, self.data.gameContract, entry_point = "go_to_space").open_some()
            param = sp.record(player = params.player, value = chance.param)
            call(h_go_to_space, param)
        sp.if chance.type == 'move_n_spaces':
            # tk : type of params expected by 'move_n_spaces' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt)
            # h_give_immunity: handle to the 'move_n_spaces' entry_point of the GamedContract
            h_move_n_spaces = sp.contract(tk, self.data.gameContract, entry_point = "move_n_spaces").open_some()
            param = sp.record(player = params.player, value = chance.param)
            call(h_move_n_spaces, param)
        sp.if chance.type == 'covid_immunity':
            # tk : type of params expected by 'give_immunity' entry_point
            tk = sp.TRecord(player = sp.TAddress)
            # h_give_immunity: handle to the 'give_immunity' entry_point of the GamedContract
            h_give_immunity = sp.contract(tk, self.data.gameContract, entry_point = "give_immunity").open_some()
            param = sp.record(player = params.player)
            call(h_give_immunity, param)
        sp.if chance.type == 'go_to_quarantine':
            # tk : type of params expected by 'put_in_quarantine' entry_point
            tk = sp.TRecord(player = sp.TAddress)
            # h_put_in_quarantine: handle to the 'put_in_quarantine' entry_point of the GamedContract
            h_put_in_quarantine = sp.contract(tk, self.data.gameContract, entry_point = "put_in_quarantine").open_some()
            param = sp.record(player = params.player)
            call(h_put_in_quarantine, param)


######################### GAME CONTRACT ###################################


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
            lastTurnOption = '',
            immunized = sp.set(t = sp.TAddress),
            nbSpaces = sp.to_int(24),
            playerPositions = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            quarantineSpaceId = 12,
            callToken = False,
            lapIncome = 200,
            nbLaps = 0,
            quarantinePlayers = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            token = originator_address,
            chance = originator_address,
            community = originator_address,
            assets = originator_address,
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
        sp.set_type(params.chance, sp.TAddress)
        sp.set_type(params.initialBalance, sp.TIntOrNat)
        self.data.token = params.token
        self.data.chance = params.chance
        self.data.status = 'started'
        self.findNextPlayer()
        #self.giveInitialBalance(params.token, params.initialBalance)
        self.giveInitialBalance()
        
    @sp.entry_point
    def reset(self, params):
        sp.verify(sp.sender == self.data.originator_address, 'Only originator is allowed to reset game')
        self.resetInitialBalance()
        self.data.token = self.data.originator_address
        self.data.chance = self.data.originator_address
        self.data.status = 'created'
        self.data.nextPlayerIdx = -1
        self.data.nextPlayer = self.data.originator_address
    
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
        # verify signature and payload match
        sp.set_type(params.payload, sp.TRecord(cardId = sp.TIntOrNat, dice1 = sp.TIntOrNat, dice2 = sp.TIntOrNat, newPosition = sp.TInt, options = sp.TSet(sp.TString)))
        sp.set_type(params.signature, sp.TSignature)
        thingToSign = sp.pack(params.payload)
        signature = sp.local("signature", params.signature)
        sp.verify(sp.check_signature(self.data.originator_pubKey, params.signature, thingToSign))
        # verify that option chosen by the player is listed in payload
        sp.verify(params.payload.options.contains(params.option))
        # verify that oldPosition + dices = newPosition
        sp.verify((self.getPlayerPosition(sp.sender) + params.payload.dice1 + params.payload.dice2) % self.data.nbSpaces == sp.as_nat(params.payload.newPosition))
        # Move the player position to the new position
        self._go_to_space(sp.sender, params.payload.newPosition)
        # TODO: distribute PoW rewards (dice1) to MINING_FARM owners according to their hashrate
        # call mining contract REWARD(dice1) -> compute reward % numLap -> compute reward[ownerX] = reward * hashrateX / totalHashrate -> token.mint(rewardX, ownerX)
        # TODO: distribute PoS rewards (dice2)  to BAKERY owners according to their stakes
        # call bakery contract REWARD(dice1) -> compute reward % numLap -> compute reward[ownerX] = reward * stakeX / totalStake -> token.mint(rewardX, ownerX)
        self.data.lastTurnOption = params.option
        # TODO: apply OPTION:
        # if COVID: if player owns immunity passport, do nothing, else move player position to quarantine + set player in quarantine mode until lap = currentLap+1
        sp.if params.option == 'COVID':
            self._put_in_quarantine(sp.sender)
        # if ASSET BUY: call asset.transfer(assetId, player) --> token.transfer(price, newOwner -> oldOwner) or token.burn() if no oldOwner
        # if ASSET PAY RENT: call asset.rent(assetId, player) --> token.transfer(asset.rentRate * owner_prorata, asset.owner) + for each shareholder token.transfer(asset.rentRate * share_prorata, shareholder)
        sp.if params.option == 'CHANCE':
            # call chance contract with params.payload.cardId
            self.chance_cc_perform(self.data.chance, params.payload.cardId, sp.sender)
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

    @sp.entry_point
    def give_immunity(self, params):
        sp.if ~self.data.immunized.contains(params.player):
            self.data.immunized.add(params.player)
            
    @sp.entry_point
    def put_in_quarantine(self, params):
        self._put_in_quarantine(params.player)
        
    def _put_in_quarantine(self, player):
        sp.if ~self.data.immunized.contains(player):
            self.setPlayerPosition(player, self.data.quarantineSpaceId)
            self.data.quarantinePlayers[player] = self.data.nbLaps + 1

    @sp.entry_point
    def move_n_spaces(self, params):
        newPosition = sp.local("newPosition", self.getPlayerPosition(params.player))
        newPosition.value += params.value
        self.data.callToken = False
        sp.if newPosition.value >= self.data.nbSpaces :
            newPosition.value -= self.data.nbSpaces
            # TODO: call token contract to give player lap income
            self.data.callToken = True
            self.givePlayerLapIncome(params.player)
            #self.testCallToken(token = params.token)
        sp.if newPosition.value < 0 :
            newPosition.value += self.data.nbSpaces
        self.setPlayerPosition(params.player, newPosition.value)

    @sp.entry_point
    def go_to_space(self, params):
        self._go_to_space(params.player, params.value)
        
    def _go_to_space(self, player, value):
        oldPosition = sp.local("oldPosition", self.getPlayerPosition(player))
        self.setPlayerPosition(player, value)
        newPosition = sp.local("newPosition", self.getPlayerPosition(player))
        self.data.callToken = False
        sp.if newPosition.value < oldPosition.value :
            # call token contract to give player lap income
            self.data.callToken = True
            self.givePlayerLapIncome(player)
            #self.testCallToken(token = params.token)

    @sp.entry_point
    def pay_amount(self, params):
        self.token_burn(params.player, params.value)
        
    @sp.entry_point
    def receive_amount(self, params):
        self.token_mint(params.player, params.value)

    def findNextPlayer(self):
        nbPlayers = sp.to_int(sp.len(self.data.players))
        foundNextPlayer = sp.local("foundNextPlayer", False)
        sp.while foundNextPlayer.value == False:
            # replace modulo with test if >= nbPlayers, then increment numLap
            self.data.nextPlayerIdx += 1
            sp.if self.data.nextPlayerIdx >= nbPlayers:
                self.data.nextPlayerIdx -= nbPlayers
                self.data.nbLaps += 1
            self.data.nextPlayer = self.data.players[self.data.nextPlayerIdx]
            # check if nextPlayer in Quarantine, then if lapUntil >= numLap call findNextPlayer again, else remove player from quarantine 
            sp.if ~self.data.quarantinePlayers.contains(self.data.nextPlayer):
                foundNextPlayer.value = True
            sp.if (self.data.quarantinePlayers.contains(self.data.nextPlayer)) & (self.data.nbLaps >  self.data.quarantinePlayers[self.data.nextPlayer]):
                # free from quarantine
                foundNextPlayer.value = True
                del self.data.quarantinePlayers[self.data.nextPlayer]


    #def giveInitialBalance(self, token, initialBalance):
    def giveInitialBalance(self):
        # tk : type of params expected by 'mint' entry_point
        tk = sp.TRecord(to = sp.TAddress, value = sp.TNat)
        # h_mint: handle to the 'mint' entry_point of the token contract
        h_mint = sp.contract(tk, self.data.token, entry_point = "mint").open_some()
        sp.for player in self.data.playersSet.elements():
            param = sp.record(to = player, value = 1500)
            call(h_mint, param)

    def resetInitialBalance(self):
        # tk : type of params expected by 'resetBalance' entry_point
        tk = sp.TRecord(address = sp.TAddress)
        # h_resetBalance: handle to the 'resetBalance' entry_point of the token contract
        h_resetBalance = sp.contract(tk, self.data.token, entry_point = "resetBalance").open_some()
        sp.for player in self.data.playersSet.elements():
            param = sp.record(address = player)
            call(h_resetBalance, param)

    def setPlayerPosition(self, player, position):
        self.data.playerPositions[player] = position
    
    def getPlayerPosition(self, player):
        sp.if ~self.data.playerPositions.contains(player):
            self.data.playerPositions[player] = 0
        return self.data.playerPositions[player];
        
    def givePlayerLapIncome(self, player):
        self.token_mint(player, self.data.lapIncome)

    def token_burn(self, address, amount):
        # tk : type of params expected by 'burn' entry_point
        tk = sp.TRecord(address = sp.TAddress, amount = sp.TNat)
        # h_burn: handle to the 'burn' entry_point of the token contract
        h_burn = sp.contract(tk, self.data.token, entry_point = "burn").open_some()
        param = sp.record(address = address, amount = sp.as_nat(amount))
        call(h_burn, param)
        
    def token_mint(self, to, value):
        # tk : type of params expected by 'mint' entry_point
        tk = sp.TRecord(to = sp.TAddress, value = sp.TNat)
        # h_mint: handle to the 'mint' entry_point of the token contract
        h_mint = sp.contract(tk, self.data.token, entry_point = "mint").open_some()
        param = sp.record(to = to, value = sp.as_nat(value))
        call(h_mint, param)
        
    def chance_cc_perform(self, contract, cardId, player):
        # tk : type of params expected by 'perform' entry_point
        tk = sp.TRecord(chanceId = sp.TNat, player = sp.TAddress)
        # h_perform: handle to the 'perform' entry_point of the chance contract
        h_perform = sp.contract(tk, contract, entry_point = "perform").open_some()
        param = sp.record(chanceId = cardId, player = player)
        call(h_perform, param)
        

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
    
    scenario.h2("Test ChanceContract")
    
    chances = {}
    chances[0] = sp.record(type = 'receive_amount', param = sp.to_int(100))
    chances[1] = sp.record(type = 'pay_amount', param = sp.to_int(100))
    chances[2] = sp.record(type = 'go_to_space', param = sp.to_int(15))
    chances[3] = sp.record(type = 'move_n_spaces', param = -3)
    chances[4] = sp.record(type = 'covid_immunity', param = sp.to_int(0))
    chances[5] = sp.record(type = 'go_to_quarantine', param = sp.to_int(0))
    chances[6] = sp.record(type = 'go_to_space', param = sp.to_int(14))
    chances[7] = sp.record(type = 'move_n_spaces', param = 3)
    
    chance = ChanceContract(originator.address, chances)
    scenario += chance

    scenario.h3("set game contract address")
    scenario += chance.setGameContract(address = contract.address)
    scenario.verify(chance.data.gameContract == contract.address)

    scenario.h3("set token contract address")
    scenario += chance.setTokenContract(address = token.address)
    scenario.verify(chance.data.tokenContract == token.address)

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
    
#    scenario.h2("Test play on not started game (expect to fail)")
#    scenario += contract.play().run (sender = alice, valid = False)
    
    scenario.h2("Test start game from unauthorized user (expect to fail)")
    scenario += contract.start(token = token.address, chance = chance.address, initialBalance = 1500).run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')

    scenario.h2("Test start game")
    scenario += contract.start(token = token.address, chance = chance.address, initialBalance = 1500).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayerIdx == 0)
    scenario.verify(contract.data.nextPlayer == alice.address)
    
    scenario.verify(token.data.totalSupply == 3000)
    scenario += token

    scenario.h2("Reset game")
    scenario += contract.reset().run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')
    
    scenario.verify(token.data.balances.contains(alice.address) == False)
    scenario.verify(token.data.balances.contains(bob.address) == False)
    scenario.verify(token.data.totalSupply == 0)
    scenario += token

    scenario.h2("Start game again")
    scenario += contract.start(token = token.address, chance = chance.address, initialBalance = 0).run(sender = originator)
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
    
#    scenario.h2("Test play on frozen game (expect to fail)")
#    scenario += contract.play().run (sender = alice, valid = False)

    scenario.h2("Test resume game from unauthorized user (expect to fail)")
    scenario += contract.resume().run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'frozen')

    scenario.h2("Test resume game")
    scenario += contract.resume().run(sender = alice)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    
    scenario.h2("Test play from Alice with wrong option (expect to fail)")
    payload = sp.record(dice1 = 1, dice2 = 3, newPosition = 4, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'CHANCE', payload = payload, signature = signature).run (sender = alice, valid = False)


    scenario.h2("Test play from Alice with wrong signature (expect to fail)")
    payload1 = sp.record(dice1 = 1, dice2 = 3, newPosition = 4, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    payload2 = sp.record(dice1 = 1, dice2 = 4, newPosition = 5, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload1))
    scenario += contract.play(option = 'NOTHING', payload = payload2, signature = signature).run (sender = alice, valid = False)

    scenario.h2("Test play from Alice with wrong newPosition (expect to fail)")
    payload = sp.record(dice1 = 1, dice2 = 3, newPosition = 11, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice, valid = False)
    
    scenario.p("expect nbLaps: 0")
    scenario.verify(contract.data.nbLaps == 0)

    scenario.h2("Test play from Alice")
    payload = sp.record(dice1 = 5, dice2 = 6, newPosition = 11, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 11)

    scenario.h2("Test play from Alice again (expect to fail)")
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice, valid = False)
    scenario.verify(contract.data.nextPlayer == bob.address)
    
    scenario.p("expect nbLaps: 0")
    scenario.verify(contract.data.nbLaps == 0)

    scenario.h2("Test play from Bob")
    payload = sp.record(dice1 = 6, dice2 = 6, newPosition = 12, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = bob)
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 12)

    scenario.h2("Test play from Bob again (expect to fail)")
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = bob, valid = False)
    scenario.verify(contract.data.nextPlayer == alice.address)

    scenario.p("expect nbLaps: 1")
    scenario.verify(contract.data.nbLaps == 1)

    scenario.h2("Test play from Alice")
    payload = sp.record(dice1 = 5, dice2 = 6, newPosition = 22, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 22)

    scenario.p("expect nbLaps: 1")
    scenario.verify(contract.data.nbLaps == 1)

    scenario.h2("Test play from Bob")
    scenario.verify(token.data.balances[bob.address].balance == 1500)
    payload = sp.record(dice1 = 6, dice2 = 6, newPosition = 0, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = bob)
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 0)
    scenario.verify(token.data.balances[bob.address].balance == 1700)

    scenario.p("expect nbLaps: 2")
    scenario.verify(contract.data.nbLaps == 2)

    scenario.h2("Test play COVID from Alice")
    scenario.verify(token.data.balances[alice.address].balance == 1500)
    payload = sp.record(dice1 = 2, dice2 = 1, newPosition = 1, cardId = 0, options = sp.set(["COVID"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'COVID', payload = payload, signature = signature).run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == contract.data.quarantineSpaceId)
    scenario.verify(token.data.balances[bob.address].balance == 1700)

    scenario.p("expect nbLaps: 2")
    scenario.verify(contract.data.nbLaps == 2)

    scenario.h2("Test play from Bob")
    payload = sp.record(dice1 = 3, dice2 = 4, newPosition = 7, cardId = 0, options = sp.set(["NOTHING", "ASSET_BUY"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = bob)
    scenario.p("Expected Bob can play again since Alice is in quarantine")
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 7)

    scenario.p("expect nbLaps: 3")
    scenario.verify(contract.data.nbLaps == 3)

    scenario.h2("Test play CHANCE from Bob, cardId=0:receive_amount")
    payload = sp.record(dice1 = 3, dice2 = 4, newPosition = 14, cardId = 0, options = sp.set(["CHANCE"]))
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'CHANCE', payload = payload, signature = signature).run (sender = bob)
    scenario.verify(token.data.balances[bob.address].balance == 1800)
    scenario.p("Alice is now free")
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 14)
    
    
    scenario.h2("Test end game from unauthorized user (expect to fail)")
    scenario += contract.end().run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')

    scenario.h2("Test end game")
    scenario += contract.end().run(sender = alice)
    # Verify expected results
    scenario.verify(contract.data.status == 'ended')
    
#    scenario.h2("Test play on ended game (expect to fail)")
#    scenario += contract.play().run (sender = alice, valid = False)
    
    scenario.verify(token.data.lastCaller != alice.address)
    scenario += token.setCaller().run(sender = alice)
    scenario.verify(token.data.lastCaller == alice.address)
    
    scenario += contract.testCallToken(token = token.address).run(sender = bob)
    scenario += token
    scenario.verify(token.data.lastCaller == contract.address)
    
    scenario += contract.testCallTokenAdminOnly(token = token.address).run(sender = bob)
    scenario += token
    scenario.verify(token.data.lastCaller == contract.address)
    
