import smartpy as sp

def call(c, x):
    sp.transfer(x, sp.mutez(0), c)


######################### TOKEN ###################################

class FakeTokenContract(sp.Contract):
    def __init__(self, admin):
        self.init(paused = False, balances = sp.map(tvalue = sp.TRecord(approvals = sp.TMap(sp.TAddress, sp.TNat), balance = sp.TNat)), admin = admin, totalSupply = 0, lastCaller = sp.address('tz1MTzrRsQLdUxLYZz6WnAnMBEx9B8v8rurG'))

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
    def setAdministrator(self, params):
        # params: (admin)
        sp.set_type(params.admin, sp.TAddress)
        sp.verify(sp.sender == self.data.admin)
        self.data.admin = params.admin

    @sp.entry_point
    def setGameContract(self, params):
        sp.verify(sp.sender == self.data.admin)
        self.data.gameContract = params.address
    
    @sp.entry_point
    def setTokenContract(self, params):
        sp.verify(sp.sender == self.data.admin)
        self.data.tokenContract = params.address
    
    @sp.entry_point
    def perform(self, params):
        sp.verify(sp.sender == self.data.admin)
        chance = self.data.chances[params.chanceId]
        #   receive_amount (N)  -> token.mint(N, player)
        #   pay_amount (N) -> token.burn(N, player)
        # TODO:  pay_amount_per_company (N) -> asset.getAssets(owner).count -> token.burn(N*count, player)
        # TODO:  pay_amount_per_mining_farm (N) -> asset.getAssets(owner, type=MINING_FARM).count -> token.burn(N*count, player)
        # TODO:  pay_amount_per_bakery (N) -> asset.getAssets(owner, type=BAKERY).count -> token.burn(N*count, player)
        #   go_to_quarantine: same COVID
        #   go_to_space (X) -> player.position = X, if X < oldPosition, token.mint(200, player)
        #   move_n_spaces (X) -> player.position += X, if newPosition >= nbSpaces, newPosition -= nbSpaces, token.mint(200, player)
        #   covid_immunity -> player.hasImmunity = true
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
        sp.if chance.type == 'pay_amount_per_company':
            # tk : type of params expected by 'pay_amount_per' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt, per = sp.TString)
            # h_pay_amount_per: handle to the 'pay_amount_per' entry_point of the GamedContract
            h_pay_amount_per = sp.contract(tk, self.data.gameContract, entry_point = "pay_amount_per").open_some()
            param = sp.record(player = params.player, value = chance.param, per = "company")
            call(h_pay_amount_per, param)
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


######################### ASSETS CONTRACT ###################################

class AssetsContract(sp.Contract):
    def __init__(self, admin, assets):
        self.init(
            admin = admin,
            gameContract = admin,
            #assets = sp.map(tkey = sp.TNat, tvalue = sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.set(t = sp.TNat), assetType = sp.TString)),
            assets = assets,
            ownership = sp.map(tkey = sp.TNat, tvalue = sp.TAddress),
            portfolio = sp.map(tkey = sp.TAddress, tvalue = sp.TSet(t = sp.TNat)),
            features = sp.map(tkey = sp.TNat, tvalue = sp.TNat),
            debug = 0
            )
    
    @sp.entry_point
    def setAdministrator(self, params):
        # params: (admin)
        sp.set_type(params.admin, sp.TAddress)
        sp.verify(sp.sender == self.data.admin)
        self.data.admin = params.admin
    
    @sp.entry_point
    def setGameContract(self, params):
        sp.verify(sp.sender == self.data.admin)
        self.data.gameContract = params.address
    
    @sp.entry_point
    def buy(self, params):
        # params: (assetId, buyer)
        sp.set_type(params.assetId, sp.TNat)
        sp.set_type(params.buyer, sp.TAddress)
        sp.verify(sp.sender == self.data.admin)
        sp.verify(self.data.assets.contains(params.assetId))
        self.data.debug = 0
        price =  sp.local("price", self.data.assets[params.assetId].price)
        sp.if self.data.features.contains(params.assetId):
            self.data.debug += 32
            price.value += self.data.assets[params.assetId].featureCost * self.data.features[params.assetId] / 2
        # get oldOwner
        sp.if self.data.ownership.contains(params.assetId):
        #sp.if self.getOwner(params.assetId).is_some():
            sp.if self.data.ownership[params.assetId] == params.buyer:
                self.data.debug += 1
            sp.else:
                # the asset is owned by another player
                self.data.debug += 2
                self.call_transfer_amount(params.buyer, self.getOwner(params.assetId).open_some(), price.value)
        sp.else:
            self.data.debug += 4
            self.call_pay_amount(params.buyer, price.value)
        self.data.debug += 8
        self.setOwner(params.assetId, params.buyer)

    @sp.entry_point
    def resell(self, params):
        # params: (assetId, seller)
        sp.set_type(params.assetId, sp.TNat)
        sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == params.player))
        sp.verify(self.data.assets.contains(params.assetId))
        sp.verify(self.data.ownership[params.assetId] == params.player)
        resell_price = sp.local("resell_price", self.data.assets[params.assetId].price * 3 / 4)
        sp.if self.data.features.contains(params.assetId):
            resell_price.value += self.data.features[params.assetId] * self.data.assets[params.assetId].featureCost / 2
            del self.data.features[params.assetId]
        self.data.portfolio[params.player].remove(params.assetId)
        sp.if sp.len(self.data.portfolio[params.player].elements()) == 0:
            del self.data.portfolio[params.player]
        del self.data.ownership[params.assetId]
        self.call_receive_amount(params.player, resell_price.value)


    @sp.entry_point
    def reset(self):
        sp.verify(sp.sender == self.data.admin)
        # self.data.ownership = sp.map(tkey = sp.TNat, tvalue = sp.TAddress)
        sp.for key in self.data.ownership.keys():
            del self.data.ownership[key]
        # self.data.portfolio = sp.map(tkey = sp.TAddress, tvalue = sp.TSet(t = sp.TNat))
        sp.for key in self.data.portfolio.keys():
            del self.data.portfolio[key]
        # self.data.features = sp.map(tkey = sp.TNat, tvalue = sp.TNat)
        sp.for key in self.data.features.keys():
            del self.data.features[key]
        self.data.debug = 16
        
    @sp.entry_point
    def pay_rent(self, params):
        # params: (assetId, player)
        sp.set_type(params.assetId, sp.TNat)
        sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == params.player))
        sp.verify(self.data.assets.contains(params.assetId))
        sp.if self.data.ownership.contains(params.assetId):
            # the asset is owned by someone
            sp.if self.data.ownership[params.assetId] != params.player:
                # the asset is owned by someone else
                nbFeatures = sp.local("nbFeatures", 0)
                sp.if self.data.features.contains(params.assetId):
                    nbFeatures.value = self.data.features[params.assetId]
                #rentRatesMap = sp.local("rentRatesMap", sp.map(l = self.data.assets[params.assetId].rentRates, tkey = sp.TNat, tvalue = sp.TNat))
                #rentRatesMap = sp.map(tkey = sp.TNat, tvalue = sp.TNat)
                rentRatesMap = sp.local("rentRatesMap", sp.map(tkey = sp.TNat, tvalue = sp.TNat))
                index = sp.local("index", 0)
                sp.for rate in self.data.assets[params.assetId].rentRates:
                    rentRatesMap.value[index.value] = rate
                    index.value += 1
                self.call_transfer_amount(params.player, self.getOwner(params.assetId).open_some(), rentRatesMap.value[nbFeatures.value])
                
    @sp.entry_point
    def invest(self, params):
        # params: (assetId, player)
        sp.set_type(params.assetId, sp.TNat)
        sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == params.player))
        sp.verify(self.data.assets.contains(params.assetId))
        sp.verify(self.data.ownership[params.assetId] == params.player)
        sp.if ~self.data.features.contains(params.assetId) | (self.data.features[params.assetId] < 4):
            self.call_pay_amount(params.player, self.data.assets[params.assetId].featureCost)
            sp.if ~self.data.features.contains(params.assetId):
                self.data.features[params.assetId] = 1
            sp.else:
                self.data.features[params.assetId] += 1
    
    @sp.entry_point
    def withdraw(self, params):
        # params: (assetId, player)
        sp.set_type(params.assetId, sp.TNat)
        sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == params.player))
        sp.verify(self.data.assets.contains(params.assetId))
        sp.verify(self.data.ownership[params.assetId] == params.player)
        sp.if self.data.features.contains(params.assetId) & (self.data.features[params.assetId] > 0):
            self.data.features[params.assetId] = sp.as_nat(sp.to_int(self.data.features[params.assetId]) - 1)
            sp.if self.data.features[params.assetId] == 0:
                del self.data.features[params.assetId]
            self.call_receive_amount(params.player, self.data.assets[params.assetId].featureCost / 2)
    
    @sp.entry_point
    def pay_amount_per(self, params):
        # params: (player, amount, per)
        sp.set_type(params.player, sp.TAddress)
        sp.set_type(params.amount, sp.TNat)
        sp.set_type(params.per, sp.TString)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == params.player))
        nbCompanies = sp.local("nbCompanies", 0)
        sp.if self.data.portfolio.contains(params.player):
            sp.for assetId in self.data.portfolio[params.player].elements():
                sp.if params.per == "company":
                    nbCompanies.value += 1
                sp.else:
                    sp.if params.per == self.data.assets[assetId].assetType:
                        nbCompanies.value += 1
        sp.if nbCompanies.value > 0:
            self.call_pay_amount(params.player, nbCompanies.value * params.amount)

    def setOwner(self, assetId, newOwner):
        # remove from oldowner protfolio if any
        #sp.if self.getOwner(assetId).is_some():
        sp.if self.data.ownership.contains(assetId):
            self.data.portfolio[self.getOwner(assetId).open_some()].remove(assetId)
        # transfer ownership
        self.data.ownership[assetId] = newOwner
        # add in newOwner protfolio
        sp.if ~self.data.portfolio.contains(newOwner):
            self.data.portfolio[newOwner] = sp.set(t = sp.TNat)
        self.data.portfolio[newOwner].add(assetId)

    def getOwner(self, assetId):
        sp.if self.data.ownership.contains(assetId):
            return sp.some(self.data.ownership[assetId])
        return sp.none
        
    def call_transfer_amount(self, from_, to, value):
        # tk : type of params expected by 'transfer_amount' entry_point
        tk = sp.TRecord(from_ = sp.TAddress, to = sp.TAddress, value = sp.TNat)
        # h_transfer_amount: handle to the 'transfer_amount' entry_point of the GamedContract
        h_transfer_amount = sp.contract(tk, self.data.gameContract, entry_point = "transfer_amount").open_some()
        param = sp.record(from_ = from_, to = to, value = value)
        call(h_transfer_amount, param)       

    def call_pay_amount(self, from_, value):
        # tk : type of params expected by 'pay_amount' entry_point
        tk = sp.TRecord(player = sp.TAddress, value = sp.TInt)
        # h_pay_amount: handle to the 'pay_amount' entry_point of the GamedContract
        h_pay_amount = sp.contract(tk, self.data.gameContract, entry_point = "pay_amount").open_some()
        param = sp.record(player = from_, value = sp.to_int(value))
        call(h_pay_amount, param)

    def call_receive_amount(self, to, value):
        # tk : type of params expected by 'receive_amount' entry_point
        tk = sp.TRecord(player = sp.TAddress, value = sp.TInt)
        # h_receive_amount: handle to the 'receive_amount' entry_point of the GamedContract
        h_receive_amount = sp.contract(tk, self.data.gameContract, entry_point = "receive_amount").open_some()
        param = sp.record(player = to, value = sp.to_int(value))
        call(h_receive_amount, param)



######################### PLAY CONTRACT ###################################

class PlayContract(sp.Contract):
    def __init__(self, admin, originator_pubKey, gameContract):
        self.init(
            admin = admin,
            originator_pubKey = originator_pubKey,
            gameContract = gameContract,
            authorized_contracts = sp.set(t = sp.TAddress),
            isActive = False,
            nextPlayer = admin,
            players = {},
            playersSet = sp.set(),
            nextPlayerIdx = -1,
            immunized = sp.set(t = sp.TAddress),
            nbSpaces = sp.to_int(24),
            playerPositions = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            lapIncome = 200,
            nbLaps = 0,
            quarantineSpaceId = 12,
            quarantinePlayers = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            token = admin,
            chance = admin,
            community = admin,
            assets = admin,
            debug = -99,
            debugStr = ''
        )
    
    @sp.entry_point
    def setIsActive(self, params):
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        self.data.isActive = params.isActive
        self.data.debug = -1
        self.data.debugStr += 'a'
        sp.if self.data.isActive == True:
            self.data.debug = 100 + sp.to_int(sp.len(self.data.playersSet))

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

    @sp.entry_point
    def setTokenContract(self, params):
        sp.set_type(params.token, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        sp.if self.data.authorized_contracts.contains(self.data.token):
            self.data.authorized_contracts.remove(self.data.token)
        self.data.token = params.token
        self.data.authorized_contracts.add(self.data.token)

    @sp.entry_point
    def setAssetsContract(self, params):
        sp.set_type(params.assets, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        sp.if self.data.authorized_contracts.contains(self.data.assets):
            self.data.authorized_contracts.remove(self.data.assets)
        self.data.assets = params.assets
        self.data.authorized_contracts.add(self.data.assets)

    @sp.entry_point
    def setChanceContract(self, params):
        sp.set_type(params.chance, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        sp.if self.data.authorized_contracts.contains(self.data.chance):
            self.data.authorized_contracts.remove(self.data.chance)
        self.data.chance = params.chance
        self.data.authorized_contracts.add(self.data.chance)

    @sp.entry_point
    def setCommunityContract(self, params):
        sp.set_type(params.community, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        sp.if self.data.authorized_contracts.contains(self.data.community):
            self.data.authorized_contracts.remove(self.data.community)
        self.data.community = params.community
        self.data.authorized_contracts.add(self.data.community)
    

    @sp.entry_point
    def register(self, params):
        sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        sp.verify(self.data.playersSet.contains(params.player) == False, 'User already registered')
        nbPlayers = sp.to_int(sp.len(self.data.players))
        self.data.players[nbPlayers] = params.player
        self.data.playersSet.add(params.player)
        self.data.playerPositions[params.player] = 0
        self.data.debugStr += 'b'
        self.data.nextPlayerIdx = 0
        self.data.nextPlayer = self.data.players[self.data.nextPlayerIdx]

    @sp.entry_point
    def reset(self):
        self.data.nextPlayerIdx = -1
        self.data.nextPlayer = self.data.admin
        self.data.nbLaps = 0
        # self.data.immunized = sp.set(t = sp.TAddress)
        sp.for element in self.data.immunized.elements():
            self.data.immunized.remove(element)
        # self.data.quarantinePlayers = sp.map(tkey = sp.TAddress, tvalue = sp.TInt)
        sp.for key in self.data.quarantinePlayers.keys():
            del self.data.quarantinePlayers[key]
        sp.for player in self.data.playersSet.elements():
            self.data.playerPositions[player] = 0

    @sp.entry_point
    def play(self, params):
        sp.verify(self.data.isActive == True, 'Play only allowed when game is in started state')
        sp.verify(self.data.nextPlayer == sp.sender, 'Only the next player is allowed to play now')
        # verify signature and payload match
        sp.set_type(params.payload, sp.TRecord(cardId = sp.TIntOrNat, dice1 = sp.TIntOrNat, dice2 = sp.TIntOrNat, newPosition = sp.TInt, options = sp.TSet(sp.TString), assetId = sp.TNat))
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
        # apply OPTION:
        # if COVID: if player owns immunity passport, do nothing, else move player position to quarantine + set player in quarantine mode until lap = currentLap+1
        sp.if params.option == 'COVID':
            self._put_in_quarantine(sp.sender)
        # if ASSET FOUND: call asset.buy(assetId, player) --> token.transfer(price, newOwner -> oldOwner) or token.burn() if no oldOwner
        sp.if params.option == 'STARTUP_FOUND':
            self._assets_buy(params.payload.assetId, sp.sender)
        # if ASSET BUY PRODUCT: call asset.pay_rent(assetId, player) --> token.transfer(asset.rentRate * owner_prorata, asset.owner) + for each shareholder token.transfer(asset.rentRate * share_prorata, shareholder)
        sp.if params.option == 'BUY_PRODUCT':
            self._assets_pay_rent(params.payload.assetId, sp.sender)
        # if CHANCE/COMMUNITY_CHEST:
        sp.if params.option == 'CHANCE':
            # call chance contract with params.payload.cardId
            self.chance_cc_perform(self.data.chance, params.payload.cardId, sp.sender)
        sp.if params.option == 'COMMUNITY_CHEST':
            # call chance contract with params.payload.cardId
            self.chance_cc_perform(self.data.community, params.payload.cardId, sp.sender)
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
    def give_immunity(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        sp.if ~self.data.immunized.contains(params.player):
            self.data.immunized.add(params.player)
            
    @sp.entry_point
    def put_in_quarantine(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self._put_in_quarantine(params.player)
        
    def _put_in_quarantine(self, player):
        sp.if ~self.data.immunized.contains(player):
            self.setPlayerPosition(player, self.data.quarantineSpaceId)
            self.data.quarantinePlayers[player] = self.data.nbLaps + 1

    @sp.entry_point
    def move_n_spaces(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        newPosition = sp.local("newPosition", self.getPlayerPosition(params.player))
        newPosition.value += params.value
        sp.if newPosition.value >= self.data.nbSpaces :
            newPosition.value -= self.data.nbSpaces
            # call token contract to give player lap income
            self.givePlayerLapIncome(params.player)
        sp.if newPosition.value < 0 :
            newPosition.value += self.data.nbSpaces
        self.setPlayerPosition(params.player, newPosition.value)

    @sp.entry_point
    def go_to_space(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self._go_to_space(params.player, params.value)
        
    def _go_to_space(self, player, value):
        oldPosition = sp.local("oldPosition", self.getPlayerPosition(player))
        self.setPlayerPosition(player, value)
        newPosition = sp.local("newPosition", self.getPlayerPosition(player))
        sp.if newPosition.value < oldPosition.value :
            # call token contract to give player lap income
            self.givePlayerLapIncome(player)
            #self.testCallToken(token = params.token)

    @sp.entry_point
    def pay_amount(self, params):
        # params: (player, value)
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self.token_burn(params.player, params.value)
    
    @sp.entry_point
    def pay_amount_per(self, params):
        # params: (player, value, per)
        sp.set_type(params.player, sp.TAddress)
        sp.set_type(params.value, sp.TInt)
        sp.set_type(params.per, sp.TString)
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self._assets_pay_amount_per(params.player, sp.as_nat(params.value), params.per)
        
    @sp.entry_point
    def receive_amount(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self.token_mint(params.player, params.value)

    @sp.entry_point
    def transfer_amount(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self.token_transfer(params.from_, params.to, params.value)

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
        
    def token_transfer(self, from_, to, value):
        # tk : type of params expected by 'transfer' entry_point
        tk = sp.TRecord(f = sp.TAddress, t = sp.TAddress, amount = sp.TNat)
        # h_transfer: handle to the 'transfer' entry_point of the token contract
        h_transfer = sp.contract(tk, self.data.token, entry_point = "transfer").open_some()
        param = sp.record(f = from_, t = to, amount = value)
        call(h_transfer, param)
        
    def chance_cc_perform(self, contract, cardId, player):
        # tk : type of params expected by 'perform' entry_point
        tk = sp.TRecord(chanceId = sp.TNat, player = sp.TAddress)
        # h_perform: handle to the 'perform' entry_point of the chance contract
        h_perform = sp.contract(tk, contract, entry_point = "perform").open_some()
        param = sp.record(chanceId = cardId, player = player)
        call(h_perform, param)
    
    def _assets_buy(self, assetId, buyer):
        # tk : type of params expected by 'buy' entry_point
        tk = sp.TRecord(assetId = sp.TNat, buyer = sp.TAddress)
        # h_perform: handle to the 'buy' entry_point of the chance contract
        h_buy = sp.contract(tk, self.data.assets, entry_point = "buy").open_some()
        param = sp.record(assetId = assetId, buyer = buyer)
        call(h_buy, param)

    def _assets_pay_rent(self, assetId, player):
        # tk : type of params expected by 'pay_rent' entry_point
        tk = sp.TRecord(assetId = sp.TNat, player = sp.TAddress)
        # h_perform: handle to the 'pay_rent' entry_point of the chance contract
        h_pay_rent = sp.contract(tk, self.data.assets, entry_point = "pay_rent").open_some()
        param = sp.record(assetId = assetId, player = player)
        call(h_pay_rent, param)

    def _assets_pay_amount_per(self, player, amount, per):
        # tk : type of params expected by 'pay_amount_per' entry_point
        tk = sp.TRecord(player = sp.TAddress, amount = sp.TNat, per = sp.TString)
        # h_pay_amount_per: handle to the 'pay_rent' entry_point of the chance contract
        h_pay_amount_per = sp.contract(tk, self.data.assets, entry_point = "pay_amount_per").open_some()
        param = sp.record(player = player, amount = amount, per = per)
        call(h_pay_amount_per, param)


######################### GAME CONTRACT ###################################


class GameContract(sp.Contract):
    def __init__(self, admin, originator_pubKey, creator_address):
        self.init(
            admin = admin,
            originator_pubKey = originator_pubKey,
            creator = creator_address,
            authorized_contracts = sp.set(t = sp.TAddress),
            #players = {},
            playersSet = sp.set(),
            status = 'created',
            #nextPlayer = admin,
            #nextPlayerIdx = -1,
            nextDices = -1,
            debug = 0,
            alreadyRegistered = False,
            lastTurnOption = '',
            #immunized = sp.set(t = sp.TAddress),
            #nbSpaces = sp.to_int(24),
            #playerPositions = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            #quarantineSpaceId = 12,
            callToken = False,
            #lapIncome = 200,
            #nbLaps = 0,
            #quarantinePlayers = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            token = admin,
            chance = admin,
            community = admin,
            assets = admin,
            playContract = admin,
            counter = 0)
    
    @sp.entry_point
    def setPlayContract(self, params):
        sp.set_type(params.play, sp.TAddress)
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to change game contracts')
        sp.if self.data.authorized_contracts.contains(self.data.playContract):
            self.data.authorized_contracts.remove(self.data.playContract)
        self.data.playContract = params.play
        self.data.authorized_contracts.add(self.data.playContract)

    @sp.entry_point
    def setTokenContract(self, params):
        sp.set_type(params.token, sp.TAddress)
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to change game contracts')
        sp.if self.data.authorized_contracts.contains(self.data.token):
            self.data.authorized_contracts.remove(self.data.token)
        self.data.token = params.token
        self.data.authorized_contracts.add(self.data.token)

    @sp.entry_point
    def setAssetsContract(self, params):
        sp.set_type(params.assets, sp.TAddress)
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to change game contracts')
        sp.if self.data.authorized_contracts.contains(self.data.assets):
            self.data.authorized_contracts.remove(self.data.assets)
        self.data.assets = params.assets
        self.data.authorized_contracts.add(self.data.assets)


    @sp.entry_point
    def register(self, params):
        sp.verify(self.data.status == 'created', 'Registering only allowed when game is in created state')
        self.data.alreadyRegistered = self.data.playersSet.contains(sp.sender)
        sp.verify(self.data.playersSet.contains(sp.sender) == False, 'User already registered')
        self.data.playersSet.add(sp.sender)

    @sp.entry_point
    def start(self, params):
        sp.verify(self.data.status == 'created', 'Start only allowed when game is in created state')
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to start game')
        sp.set_type(params.token, sp.TAddress)
        sp.set_type(params.chance, sp.TAddress)
        sp.set_type(params.community, sp.TAddress)
        sp.set_type(params.assets, sp.TAddress)
        sp.set_type(params.initialBalance, sp.TIntOrNat)
        self.data.token = params.token
        self.data.authorized_contracts.add(params.token)
        self.data.chance = params.chance
        self.data.authorized_contracts.add(params.chance)
        self.data.community = params.community
        self.data.authorized_contracts.add(params.community)
        self.data.assets = params.assets
        self.data.authorized_contracts.add(params.assets)
        self.data.status = 'started'
        #self.giveInitialBalance(params.token, params.initialBalance)
        self.giveInitialBalance()
        sp.for player in self.data.playersSet.elements():
            self.play_register(player)
        self.play_setIsActive(True)
        self.play_setTokenContract(params.token)
        self.play_setChanceContract(params.chance)
        self.play_setAssetsContract(params.assets)

        
    @sp.entry_point
    def reset(self, params):
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to reset game')
        self.resetInitialBalance()
        self.resetAssets()
        # self.data.authorized_contracts = sp.set(t = sp.TAddress)
        sp.for element in self.data.authorized_contracts.elements():
            self.data.authorized_contracts.remove(element)
        self.data.token = self.data.admin
        self.data.chance = self.data.admin
        self.data.status = 'created'
    
    @sp.entry_point
    def reset2(self, params):
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to reset game')
        #self.resetInitialBalance()
        #self.resetAssets()
        # self.data.authorized_contracts = sp.set(t = sp.TAddress)
        sp.for element in self.data.authorized_contracts.elements():
            self.data.authorized_contracts.remove(element)
        self.data.token = self.data.admin
        self.data.chance = self.data.admin
        self.data.status = 'created'

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
    def setCreator(self, params):
        sp.set_type(params.creator_address, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.creator), 'Only originator or actual creator is allowed to change creator')
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
    
    def resetAssets(self):
        # tk : type of params expected by 'reset' entry_point
        tk = sp.TUnit
        # h_reset: handle to the 'reset' entry_point of the assets contract
        h_reset = sp.contract(tk, self.data.assets, entry_point = "reset").open_some()
        param = sp.unit
        call(h_reset, param)
        
    def play_setIsActive(self, isActive):
        # tk : type of params expected by 'setIsActive' entry_point
        tk = sp.TRecord(isActive = sp.TBool)
        # h_setIsActive: handle to the 'setIsActive' entry_point of the play contract
        h_setIsActive = sp.contract(tk, self.data.playContract, entry_point = "setIsActive").open_some()
        param = sp.record(isActive = True)
        call(h_setIsActive, param)
    
    def play_register(self, player):
        # tk : type of params expected by 'register' entry_point
        tk = sp.TRecord(player = sp.TAddress)
        # h_register: handle to the 'register' entry_point of the play contract
        h_register = sp.contract(tk, self.data.playContract, entry_point = "register").open_some()
        param = sp.record(player = player)
        call(h_register, param)
    
    def play_setTokenContract(self, contract):
        # tk : type of params expected by 'setXxxContract' entry_point
        tk = sp.TRecord(token = sp.TAddress)
        h_setXxxContract = sp.contract(tk, self.data.playContract, entry_point = "setTokenContract").open_some()
        param = sp.record(token = contract)
        call(h_setXxxContract, param)

    def play_setAssetsContract(self, contract):
        # tk : type of params expected by 'setXxxContract' entry_point
        tk = sp.TRecord(assets = sp.TAddress)
        h_setXxxContract = sp.contract(tk, self.data.playContract, entry_point = "setAssetsContract").open_some()
        param = sp.record(assets = contract)
        call(h_setXxxContract, param)

    def play_setChanceContract(self, contract):
        # tk : type of params expected by 'setXxxContract' entry_point
        tk = sp.TRecord(chance = sp.TAddress)
        h_setXxxContract = sp.contract(tk, self.data.playContract, entry_point = "setChanceContract").open_some()
        param = sp.record(chance = contract)
        call(h_setXxxContract, param)


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

    scenario.h2("Create Token contract")
    token = FakeTokenContract(contract.address)
    scenario += token
    
    scenario.verify(token.data.admin == contract.address)
    scenario.verify(token.data.totalSupply == 0)
    
    scenario.h2("set Game Creator = Bob")
    scenario += contract.setCreator(creator_address = bob.address).run(sender = originator)
    scenario.verify(contract.data.creator == bob.address)
    scenario.h2("set Game Creator = Alice")
    scenario += contract.setCreator(creator_address = alice.address).run(sender = bob)
    scenario.verify(contract.data.creator == alice.address)
    
    scenario.h2("Test register alice")
    scenario += contract.register().run(sender = alice)
    # Verify expected results
    scenario.verify(sp.len(contract.data.playersSet) == 1)

    scenario.h2("Test register bob")
    scenario += contract.register().run(sender = bob)
    # Verify expected results
    scenario.verify(sp.len(contract.data.playersSet) == 2)

    scenario.h2("Test register alice again (expect to fail)")
    scenario += contract.register().run(sender = alice, valid = False)
    # Verify expected results
    scenario.verify(sp.len(contract.data.playersSet) == 2)
    
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

    scenario.h3("set game contract address in chance")
    scenario += chance.setGameContract(address = contract.address).run(sender = originator)
    scenario.verify(chance.data.gameContract == contract.address)

    scenario.h3("set token contract address in chance")
    scenario += chance.setTokenContract(address = token.address).run(sender = originator)
    scenario.verify(chance.data.tokenContract == token.address)
    

    scenario.h2("Test CommunityContract")
    
    community_cards = {}
    community_cards[0] = sp.record(type = 'receive_amount', param = sp.to_int(100))
    community_cards[1] = sp.record(type = 'pay_amount_per_company', param = sp.to_int(110))
    community_cards[2] = sp.record(type = 'go_to_space', param = sp.to_int(15))
    community_cards[3] = sp.record(type = 'move_n_spaces', param = -3)
    community_cards[4] = sp.record(type = 'covid_immunity', param = sp.to_int(0))
    community_cards[5] = sp.record(type = 'go_to_quarantine', param = sp.to_int(0))
    community_cards[6] = sp.record(type = 'go_to_space', param = sp.to_int(14))
    community_cards[7] = sp.record(type = 'move_n_spaces', param = 3)
    
    community = ChanceContract(originator.address, community_cards)
    scenario += community

    scenario.h3("set game contract address in community")
    scenario += community.setGameContract(address = contract.address).run(sender = originator)
    scenario.verify(community.data.gameContract == contract.address)

    scenario.h3("set token contract address in community")
    scenario += community.setTokenContract(address = token.address).run(sender = originator)
    scenario.verify(community.data.tokenContract == token.address)


    scenario.h2("Test AssetsContract")

    assets = {}
    assets[0] = sp.record(assetId = 0, price = 200, featureCost = 50, rentRates = [12, 36, 150, 300, 600], assetType = 'STARTUP')
    assets[1] = sp.record(assetId = 1, price = 200, featureCost = 50, rentRates = [12, 36, 150, 300, 600], assetType = 'STARTUP')
    assets[2] = sp.record(assetId = 2, price = 200, featureCost = 50, rentRates = [12, 36, 150, 300, 600], assetType = 'STARTUP')
    assets[3] = sp.record(assetId = 3, price = 200, featureCost = 50, rentRates = [12, 36, 150, 300, 600], assetType = 'STARTUP')
    assets[4] = sp.record(assetId = 4, price = 1500, featureCost = 50, rentRates = [12, 36, 150, 300, 600], assetType = 'STARTUP')
    
    assetsContract = AssetsContract(originator.address, assets)
    scenario += assetsContract
    
#    scenario.h2("Test play on not started game (expect to fail)")
#    scenario += contract.play().run (sender = alice, valid = False)

    scenario.h2("Test start game from unauthorized user (expect to fail)")
    scenario += contract.start(token = token.address, chance = chance.address, community = community.address, assets = assetsContract.address, initialBalance = 1500).run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')
    
    scenario.h2("Create Play Contract")
    
    playContract = PlayContract(originator.address, originator.public_key, contract.address)
    
    scenario += playContract
    scenario.verify(playContract.data.gameContract == contract.address)
    
    scenario += playContract.setTokenContract(token = token.address).run(sender = originator)
    scenario.verify(playContract.data.token == token.address)
    
    scenario.h3("set game contract address in assets contract")
    scenario += assetsContract.setGameContract(address = playContract.address).run(sender = originator)
    scenario.verify(assetsContract.data.gameContract == playContract.address)

    scenario += contract.setPlayContract(play = playContract.address).run(sender = originator)
    
    scenario.h2("Start game")
    scenario += contract.start(token = token.address, chance = chance.address, community = community.address, assets = assetsContract.address, initialBalance = 0).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(playContract.data.nextPlayerIdx == 0)
    scenario.verify(playContract.data.nextPlayer == alice.address)

    scenario.verify(token.data.totalSupply == 3000)
    scenario += token

    aliceBalanceExpected = 1500
    bobBalanceExpected = 1500
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)

    scenario.h3('Test Alice buys assets[0]')
    scenario += assetsContract.buy(assetId = 0, buyer = alice.address).run(sender = originator)
    aliceBalanceExpected -= 200
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)







