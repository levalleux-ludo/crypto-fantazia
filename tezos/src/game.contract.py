import smartpy as sp

def call(c, x):
    sp.transfer(x, sp.mutez(0), c)


######################### TOKEN ###################################

class FakeTokenContract(sp.Contract):
    def __init__(self, admin):
        self.init(
            paused = False,
            balances = sp.map(tvalue = sp.TRecord(approvals = sp.TMap(sp.TAddress, sp.TNat), balance = sp.TNat)),
            admin = admin,
            totalSupply = 0,
            authorized_contracts = sp.set(t = sp.TAddress)
        )

    @sp.entry_point
    def setAdministrator(self, params):
        sp.verify(sp.sender == self.data.admin)
        self.data.admin = params.admin

    @sp.entry_point
    def addAuthorizedContract(self, params):
        sp.set_type(params.contract, sp.TAddress)
        sp.verify(sp.sender == self.data.admin)
        self.data.authorized_contracts.add(params.contract)

    @sp.entry_point
    def mint(self, params):
        # Pb with SmartPY ? (do not occur wit hdev version https://smartpy.io/dev/index.html)
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self.addAddressIfNecessary(params.to)
        self.data.balances[params.to].balance += params.value
        self.data.totalSupply += params.value
    
    @sp.entry_point
    def burn(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        sp.verify(self.data.balances[params.address].balance >= params.amount)
        self.data.balances[params.address].balance = sp.as_nat(self.data.balances[params.address].balance - params.amount)
        self.data.totalSupply = sp.as_nat(self.data.totalSupply - params.amount)
    
    @sp.entry_point
    def transfer(self, params):
        sp.verify((sp.sender == self.data.admin) |
            (self.data.authorized_contracts.contains(sp.sender)) |
            (~self.data.paused &
                ((params.f == sp.sender) |
                 (self.data.balances[params.f].approvals[sp.sender] >= params.amount))))
        self.addAddressIfNecessary(params.t)
        sp.verify(self.data.balances[params.f].balance >= params.amount)
        self.data.balances[params.f].balance = sp.as_nat(self.data.balances[params.f].balance - params.amount)
        self.data.balances[params.t].balance += params.amount
        sp.if (params.f != sp.sender) & (self.data.admin != sp.sender) & (~self.data.authorized_contracts.contains(sp.sender)):
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
            gameContract = admin
        )
    
    @sp.entry_point
    def setAdministrator(self, params):
        # params: (admin)
        sp.verify(sp.sender == self.data.admin)
        self.data.admin = params.admin

    @sp.entry_point
    def setGameContract(self, params):
        sp.verify(sp.sender == self.data.admin)
        self.data.gameContract = params.address
    
    @sp.entry_point
    def perform(self, params):
        # params: (chanceId, player)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        sp.set_type(params.chanceId, sp.TNat)
        sp.set_type(params.player, sp.TAddress)
        chance = self.data.chances[params.chanceId]
        #   receive_amount (N)  -> token.mint(N, player)
        #   pay_amount (N) -> token.burn(N, player)
        # TODO:  pay_amount_per_mining_farm (N) -> asset.getAssets(owner, type=MINING_FARM).count -> token.burn(N*count, player)
        # TODO:  pay_amount_per_bakery (N) -> asset.getAssets(owner, type=BAKERY).count -> token.burn(N*count, player)
        #   go_to_quarantine: same COVID
        #   go_to_space (X) -> player.position = X, if X < oldPosition, token.mint(200, player)
        #   move_n_spaces (X) -> player.position += X, if newPosition >= nbSpaces, newPosition -= nbSpaces, token.mint(200, player)
        #   covid_immunity -> player.hasImmunity = true
        sp.if chance.type == 'covid_immunity':
            # tk : type of params expected by 'give_immunity' entry_point
            tk = sp.TRecord(player = sp.TAddress)
            # h_give_immunity: handle to the 'give_immunity' entry_point of the GamedContract
            h_give_immunity = sp.contract(tk, self.data.gameContract, entry_point = "give_immunity").open_some()
            param = sp.record(player = params.player)
            call(h_give_immunity, param)       


######################### ASSETS CONTRACT ###################################

class AssetsContract(sp.Contract):
    def __init__(self, admin, originator_pubKey):
        self.init(
            admin = admin,
            originator_pubKey = originator_pubKey,
            gameContract = admin,
            tokenContract = admin,
            #assets = sp.map(tkey = sp.TNat, tvalue = sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.set(t = sp.TNat), assetType = sp.TString)),
            ownership = sp.map(tkey = sp.TNat, tvalue = sp.TAddress),
            portfolio = sp.map(tkey = sp.TAddress, tvalue = sp.TSet(t = sp.TNat)),
            features = sp.map(tkey = sp.TNat, tvalue = sp.TNat),
            debug = 0
            )
    
    @sp.entry_point
    def setAdministrator(self, params):
        # params: (admin)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        self.data.admin = params.admin
    
    @sp.entry_point
    def setGameContract(self, params):
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        self.data.gameContract = params.address

    @sp.entry_point
    def setTokenContract(self, params):
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        self.data.tokenContract = params.contract
    
    @sp.entry_point
    def play(self, params):
        sp.set_type(params.option, sp.TString)
        sp.set_type(params.payload, sp.TRecord(card = sp.TRecord(type = sp.TString, param = sp.TInt), dice1 = sp.TIntOrNat, dice2 = sp.TIntOrNat, newPosition = sp.TInt, options = sp.TSet(sp.TString), asset = sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.TSet(sp.TNat), assetType = sp.TString)))
        sp.set_type(params.signature, sp.TSignature)
        thingToSign = sp.pack(params.payload)
        sp.verify(sp.check_signature(self.data.originator_pubKey, params.signature, thingToSign))
        # verify that option chosen by the player is listed in payload
        sp.verify(params.payload.options.contains(params.option))
        # then perform the option
        sp.if params.option == 'STARTUP_FOUND':
            self._buy(params.payload.asset, sp.sender)
        sp.if params.option == 'BUY_PRODUCT':
            self._pay_rent(params.payload.asset, sp.sender)
        self.call_game_play(params.option, params.payload, params.signature)

    
    @sp.private_entry_point
    def buy(self, params):
        # params: (asset, buyer)
        sp.set_type(params.asset, sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.TSet(sp.TNat), assetType = sp.TString))
        sp.set_type(params.buyer, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
        self._buy(params.asset, params.buyer)
        
    def _buy(self, asset, buyer):
        self.data.debug = 0
        price =  sp.local("price", asset.price)
        sp.if self.data.features.contains(asset.assetId):
            self.data.debug += 32
            price.value += asset.featureCost * self.data.features[asset.assetId] / 2
        # get oldOwner
        sp.if self.data.ownership.contains(asset.assetId):
        #sp.if self.getOwner(params.assetId).is_some():
            sp.if self.data.ownership[asset.assetId] == buyer:
                self.data.debug += 1
            sp.else:
                # the asset is owned by another player
                self.data.debug += 2
                self.call_transfer_amount(buyer, self.getOwner(asset.assetId).open_some(), price.value)
        sp.else:
            self.data.debug += 4
            self.call_pay_amount(buyer, price.value)
        self.data.debug += 8
        self.setOwner(asset.assetId, buyer)

#    @sp.entry_point
#    def resell(self, params):
#        # params: (assetId, seller)
#        # sp.set_type(params.assetId, sp.TNat)
#        # sp.set_type(params.player, sp.TAddress)
#        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract) | (sp.sender #== params.player))
#        sp.verify(self.data.assets.contains(params.assetId))
#        sp.verify(self.data.ownership[params.assetId] == params.player)
#        resell_price = sp.local("resell_price", self.data.assets[params.assetId].price * 3 / 4)
#        sp.if self.data.features.contains(params.assetId):
#            resell_price.value += self.data.features[params.assetId] * self.data.assets[params.assetId].featureCost / 2
#            del self.data.features[params.assetId]
#        self.data.portfolio[params.player].remove(params.assetId)
#        sp.if sp.len(self.data.portfolio[params.player].elements()) == 0:
#            del self.data.portfolio[params.player]
#        del self.data.ownership[params.assetId]
#        self.call_receive_amount(params.player, resell_price.value)

    @sp.entry_point
    def reset(self):
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract))
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
        
    @sp.private_entry_point
    def pay_rent(self, params):
        # params: (asset, player)
        sp.set_type(params.asset, sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.TSet(sp.TNat), assetType = sp.TString))
        # sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract) | (sp.sender == params.player))
        self._pay_rent(params.asset, params.player)
        
    def _pay_rent(self, asset, player):
        sp.if self.data.ownership.contains(asset.assetId):
            # the asset is owned by someone
            sp.if self.data.ownership[asset.assetId] != player:
                # the asset is owned by someone else
                nbFeatures = sp.local("nbFeatures", 0)
                sp.if self.data.features.contains(asset.assetId):
                    nbFeatures.value = self.data.features[asset.assetId]
                #rentRatesMap = sp.local("rentRatesMap", sp.map(l = self.data.assets[params.assetId].rentRates, tkey = sp.TNat, tvalue = sp.TNat))
                #rentRatesMap = sp.map(tkey = sp.TNat, tvalue = sp.TNat)
                rentRatesMap = sp.local("rentRatesMap", sp.map(tkey = sp.TNat, tvalue = sp.TNat))
                index = sp.local("index", 0)
                sp.for rate in asset.rentRates.elements():
                    rentRatesMap.value[index.value] = rate
                    index.value += 1
                self.call_transfer_amount(player, self.getOwner(asset.assetId).open_some(), rentRatesMap.value[nbFeatures.value])
                
    @sp.entry_point
    def invest(self, params):
        # params: (asset, player)
        sp.set_type(params.asset, sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.TSet(sp.TNat), assetType = sp.TString))
        # sp.set_type(params.player, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract) | (sp.sender == params.player))
        sp.verify(self.data.ownership[params.asset.assetId] == params.player)
        sp.if ~self.data.features.contains(params.asset.assetId) | (self.data.features[params.asset.assetId] < 4):
            self.call_pay_amount(params.player, params.asset.featureCost)
            sp.if ~self.data.features.contains(params.asset.assetId):
                self.data.features[params.asset.assetId] = 1
            sp.else:
                self.data.features[params.asset.assetId] += 1
    
#    @sp.entry_point
#    def withdraw(self, params):
#        # params: (assetId, player)
#        # sp.set_type(params.assetId, sp.TNat)
#        # sp.set_type(params.player, sp.TAddress)
#        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract) | (sp.sender #== params.player))
#        sp.verify(self.data.assets.contains(params.assetId))
#        sp.verify(self.data.ownership[params.assetId] == params.player)
#        sp.if self.data.features.contains(params.assetId) & (self.data.features[params.assetId] > 0):
#            self.data.features[params.assetId] = sp.as_nat(sp.to_int(self.data.features[params.assetId]) - 1)
#            sp.if self.data.features[params.assetId] == 0:
#                del self.data.features[params.assetId]
#            self.call_receive_amount(params.player, self.data.assets[params.assetId].featureCost / 2)
    
    @sp.entry_point
    def pay_amount_per(self, params):
        # params: (player, amount, per)
        # sp.set_type(params.player, sp.TAddress)
        # sp.set_type(params.amount, sp.TNat)
        # sp.set_type(params.per, sp.TString)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.gameContract) | (sp.sender == params.player))
        nbCompanies = sp.local("nbCompanies", 0)
        sp.if self.data.portfolio.contains(params.player):
            sp.for assetId in self.data.portfolio[params.player].elements():
                sp.if params.per == "company":
                    nbCompanies.value += 1
#                sp.else:
#                    sp.if params.per == self.data.assets[assetId].assetType:
#                        nbCompanies.value += 1
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
        # tk : type of params expected by 'transfer' entry_point
        tk = sp.TRecord(f = sp.TAddress, t = sp.TAddress, amount = sp.TNat)
        # h_transfer: handle to the 'transfer' entry_point of the token contract
        h_transfer = sp.contract(tk, self.data.tokenContract, entry_point = "transfer").open_some()
        param = sp.record(f = from_, t = to, amount = value)
        call(h_transfer, param)

    def call_pay_amount(self, from_, value):
        # tk : type of params expected by 'burn' entry_point
        tk = sp.TRecord(address = sp.TAddress, amount = sp.TNat)
        # h_burn: handle to the 'burn' entry_point of the token contract
        h_burn = sp.contract(tk, self.data.tokenContract, entry_point = "burn").open_some()
        param = sp.record(address = from_, amount = value)
        call(h_burn, param)

    def call_receive_amount(self, to, value):
         # tk : type of params expected by 'mint' entry_point
        tk = sp.TRecord(to = sp.TAddress, value = sp.TNat)
        # h_mint: handle to the 'mint' entry_point of the token contract
        h_mint = sp.contract(tk, self.data.tokenContract, entry_point = "mint").open_some()
        param = sp.record(to = to, value = value)
        call(h_mint, param)

    def call_game_play(self, option, payload, signature):
        # tk : type of params expected by 'force_next_player' entry_point
        tk = sp.TRecord(player = sp.TAddress, newPosition = sp.TInt)
        # h_play: handle to the 'force_next_player' entry_point of the GamedContract
        h_play = sp.contract(tk, self.data.gameContract, entry_point = "force_next_player").open_some()
        param = sp.record(player = sp.sender, newPosition = payload.newPosition)
        call(h_play, param)


######################### GAME CONTRACT ###################################


class GameContract(sp.Contract):
    def __init__(self, admin, originator_pubKey, creator_address):
        self.init(
            admin = admin,
            originator_pubKey = originator_pubKey,
            creator = creator_address,
            authorized_contracts = sp.set(t = sp.TAddress),
            players = {},
            playersSet = sp.set(),
            status = 'created',
            nextPlayer = admin,
            nextPlayerIdx = -1,
            immunized = sp.set(t = sp.TAddress),
            nbSpaces = sp.to_int(24),
            playerPositions = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            quarantineSpaceId = 12,
            lapIncome = 200,
            nbLaps = 0,
            quarantinePlayers = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            token = admin,
            assets = admin)
    
    @sp.entry_point
    def register(self, params):
        sp.verify(self.data.status == 'created', 'Registering only allowed when game is in created state')
        sp.verify(self.data.playersSet.contains(sp.sender) == False, 'User already registered')
        nbPlayers = sp.to_int(sp.len(self.data.players))
        self.data.players[nbPlayers] = sp.sender
        self.data.playersSet.add(sp.sender)
        self.data.playerPositions[sp.sender] = 0

    @sp.entry_point
    def start(self, params):
        sp.verify(self.data.status == 'created', 'Start only allowed when game is in created state')
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to start game')
        sp.set_type(params.token, sp.TAddress)
        sp.set_type(params.assets, sp.TAddress)
        sp.set_type(params.initialBalance, sp.TIntOrNat)
        self.data.token = params.token
        self.data.authorized_contracts.add(params.token)
        self.data.assets = params.assets
        self.data.authorized_contracts.add(params.assets)
        self.token_addAuthorizedContract(params.assets)
        self.data.status = 'started'
        self.findNextPlayer()
        #self.giveInitialBalance(params.token, params.initialBalance)
        self.giveInitialBalance()
        
        
    @sp.entry_point
    def reset_start(self, params):
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to reset game')
        self.data.status = 'resetting'
        self.resetInitialBalance()
        #self.resetAssets()

    @sp.entry_point
    def reset_complete(self, params):
        sp.verify(sp.sender == self.data.admin, 'Only originator is allowed to reset game')
        sp.verify(self.data.status == 'resetting', 'Reset_complete only allowed when game is in resetting state')
        sp.for element in self.data.authorized_contracts.elements():
            self.data.authorized_contracts.remove(element)
        self.data.token = self.data.admin
        self.data.status = 'created'
        self.data.nextPlayerIdx = -1
        self.data.nextPlayer = self.data.admin
        self.data.nbLaps = 0
        sp.for element in self.data.immunized.elements():
            self.data.immunized.remove(element)
        sp.for key in self.data.quarantinePlayers.keys():
            del self.data.quarantinePlayers[key]
        sp.for player in self.data.playersSet.elements():
            self.data.playerPositions[player] = 0

   
    @sp.entry_point
    def force_next_player(self, params):
        # params = (player, newPosition)
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        sp.verify(self.data.status == 'started', 'Play only allowed when game is in started state')
        sp.verify(self.data.nextPlayer == params.player)
        self._go_to_space(params.player, params.newPosition)
        self.findNextPlayer()
        
    @sp.entry_point
    def play(self, params):
        sp.verify(self.data.status == 'started', 'Play only allowed when game is in started state')
        # verify signature and payload match
        sp.set_type(params.payload, sp.TRecord(card = sp.TRecord(type = sp.TString, param = sp.TInt), dice1 = sp.TIntOrNat, dice2 = sp.TIntOrNat, newPosition = sp.TInt, options = sp.TSet(sp.TString), asset = sp.TRecord(assetId = sp.TNat, price = sp.TNat, featureCost = sp.TNat, rentRates = sp.TSet(sp.TNat), assetType = sp.TString)))
        self._play(params.option, params.payload, params.signature, sp.sender)
        
    def _play(self, option, payload, signature, player):
        sp.verify(self.data.nextPlayer == player, 'Only the next player is allowed to play now')
        thingToSign = sp.pack(payload)
        sp.verify(sp.check_signature(self.data.originator_pubKey, signature, thingToSign))
        # verify that option chosen by the player is listed in payload
        sp.verify(payload.options.contains(option))
        # verify that oldPosition + dices = newPosition
        sp.verify((self.getPlayerPosition(player) + payload.dice1 + payload.dice2) % self.data.nbSpaces == sp.as_nat(payload.newPosition))
        # Move the player position to the new position
        self._go_to_space(player, payload.newPosition)
        # TODO: distribute PoW rewards (dice1) to MINING_FARM owners according to their hashrate
        # call mining contract REWARD(dice1) -> compute reward % numLap -> compute reward[ownerX] = reward * hashrateX / totalHashrate -> token.mint(rewardX, ownerX)
        # TODO: distribute PoS rewards (dice2)  to BAKERY owners according to their stakes
        # call bakery contract REWARD(dice1) -> compute reward % numLap -> compute reward[ownerX] = reward * stakeX / totalStake -> token.mint(rewardX, ownerX)
        # apply OPTION:
        # if COVID: if player owns immunity passport, do nothing, else move player position to quarantine + set player in quarantine mode until lap = currentLap+1
        sp.if option == 'COVID':
            self._put_in_quarantine(player)
        # if CHANCE/COMMUNITY_CHEST:
        sp.if option == 'CHANCE':
            # call chance contract with params.payload.cardId
            self.chance_cc_perform(payload.card.type, payload.card.param, player)
        sp.if option == 'COMMUNITY_CHEST':
            # call chance contract with params.payload.cardId
            self.chance_cc_perform(payload.card.type, payload.card.param, player)
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
        # sp.set_type(params.creator_address, sp.TAddress)
        sp.verify((sp.sender == self.data.admin) | (sp.sender == self.data.creator), 'Only originator or actual creator is allowed to change creator')
        self.data.creator = params.creator_address
        
        
    def _give_immunity(self, player):
        sp.if ~self.data.immunized.contains(player):
            self.data.immunized.add(player)
            
    def _put_in_quarantine(self, player):
        sp.if ~self.data.immunized.contains(player):
            self.setPlayerPosition(player, self.data.quarantineSpaceId)
            self.data.quarantinePlayers[player] = self.data.nbLaps + 1

    @sp.private_entry_point
    def move_n_spaces(self, params):
        sp.verify((sp.sender == self.data.admin) | (self.data.authorized_contracts.contains(sp.sender)))
        self._move_n_spaces(params.player, params.value)

    def _move_n_spaces(self, player, value):
        newPosition = sp.local("newPosition", self.getPlayerPosition(player))
        newPosition.value += value
        sp.if newPosition.value >= self.data.nbSpaces :
            newPosition.value -= self.data.nbSpaces
            # call token contract to give player lap income
            self.givePlayerLapIncome(player)
        sp.if newPosition.value < 0 :
            newPosition.value += self.data.nbSpaces
        self.setPlayerPosition(player, newPosition.value)

    def _go_to_space(self, player, value):
        #oldPosition2 = sp.local("oldPosition2", self.getPlayerPosition(player))
        #newPosition2 = sp.local("newPosition", self.getPlayerPosition(player))
        sp.if ~self.data.playerPositions.contains(player):
            self.data.playerPositions[player] = 0
        sp.if value < self.data.playerPositions[player] :
            # call token contract to give player lap income
            self.givePlayerLapIncome(player)
        self.setPlayerPosition(player, value)
        #newPosition2 = sp.local("newPosition2", self.getPlayerPosition(player))
        
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
        param = sp.record(address = address, amount = amount)
        call(h_burn, param)
        
    def token_mint(self, to, value):
        # tk : type of params expected by 'mint' entry_point
        tk = sp.TRecord(to = sp.TAddress, value = sp.TNat)
        # h_mint: handle to the 'mint' entry_point of the token contract
        h_mint = sp.contract(tk, self.data.token, entry_point = "mint").open_some()
        param = sp.record(to = to, value = value)
        call(h_mint, param)
        
    def token_addAuthorizedContract(self, contract):
        # tk : type of params expected by 'addAuthorizedContract' entry_point
        tk = sp.TRecord(contract = sp.TAddress)
        # h_addAuthorizedContract: handle to the 'addAuthorizedContract' entry_point of the token contract
        h_addAuthorizedContract = sp.contract(tk, self.data.token, entry_point = "addAuthorizedContract").open_some()
        param = sp.record(contract = contract)
        call(h_addAuthorizedContract, param)
        
    def chance_cc_perform(self, cardType, cardParam, player):
        sp.if cardType == 'receive_amount':
            self.token_mint(player, sp.as_nat(cardParam))
        sp.if cardType == 'pay_amount':
            self.token_burn(player, sp.as_nat(cardParam))
        sp.if cardType == 'pay_amount_per_company':
            self._assets_pay_amount_per(player, sp.as_nat(cardParam), "company")
        sp.if cardType == 'go_to_space':
            self._go_to_space(player, cardParam)
        sp.if cardType == 'move_n_spaces':
            self._move_n_spaces(player, cardParam)
        sp.if cardType == 'covid_immunity':
            self._give_immunity(player)
        sp.if cardType == 'go_to_quarantine':
            self._put_in_quarantine(player)
    
    def _assets_pay_amount_per(self, player, amount, per):
        # tk : type of params expected by 'pay_amount_per' entry_point
        tk = sp.TRecord(player = sp.TAddress, amount = sp.TNat, per = sp.TString)
        # h_pay_amount_per: handle to the 'pay_rent' entry_point of the chance contract
        h_pay_amount_per = sp.contract(tk, self.data.assets, entry_point = "pay_amount_per").open_some()
        param = sp.record(player = player, amount = amount, per = per)
        call(h_pay_amount_per, param)
        

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
    scenario.verify(sp.len(contract.data.players) == 1)

    scenario.h2("Test register bob")
    scenario += contract.register().run(sender = bob)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 2)

    scenario.h2("Test register alice again (expect to fail)")
    scenario += contract.register().run(sender = alice, valid = False)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 2)
    
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

    scenario.h2("Test AssetsContract")

    assets = {}
    assets[0] = sp.record(assetId = 0, price = 200, featureCost = 50, rentRates = sp.set([12, 36, 150, 300, 600]), assetType = 'STARTUP')
    assets[1] = sp.record(assetId = 1, price = 200, featureCost = 50, rentRates = sp.set([12, 36, 150, 300, 600]), assetType = 'STARTUP')
    assets[2] = sp.record(assetId = 2, price = 200, featureCost = 50, rentRates = sp.set([12, 36, 150, 300, 600]), assetType = 'STARTUP')
    assets[3] = sp.record(assetId = 3, price = 200, featureCost = 50, rentRates = sp.set([12, 36, 150, 300, 600]), assetType = 'STARTUP')
    assets[4] = sp.record(assetId = 4, price = 1500, featureCost = 50, rentRates = sp.set([12, 36, 150, 300, 600]), assetType = 'STARTUP')
    
    assetsContract = AssetsContract(originator.address, originator.public_key)
    scenario += assetsContract
    
    scenario.h3("set game contract address in assets contract")
    scenario += assetsContract.setGameContract(address = contract.address).run(sender = originator)
    scenario.verify(assetsContract.data.gameContract == contract.address)

    scenario.h3("set token contract address in assets contract")
    scenario += assetsContract.setTokenContract(contract = token.address).run(sender = originator)
    scenario.verify(assetsContract.data.tokenContract == token.address)

#    scenario.h2("Test play on not started game (expect to fail)")
#    scenario += contract.play().run (sender = alice, valid = False)

    scenario.h2("Test start game from unauthorized user (expect to fail)")
    scenario += contract.start(token = token.address, assets = assetsContract.address, initialBalance = 1500).run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')
    
    scenario.h2("Start game")
    scenario += contract.start(token = token.address, assets = assetsContract.address, initialBalance = 0).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayerIdx == 0)
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(token.data.totalSupply == 3000)
    scenario += token

    aliceBalanceExpected = 1500
    bobBalanceExpected = 1500
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)

    scenario.h3('Test Alice buys assets[0]')
    scenario += assetsContract.buy(asset = assets[0], buyer = alice.address).run(sender = originator)
    aliceBalanceExpected -= 200
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(assetsContract.data.ownership.contains(0))
    scenario.verify(assetsContract.data.ownership[0] == alice.address)
    scenario.verify(assetsContract.data.portfolio.contains(alice.address))
    scenario.verify(assetsContract.data.portfolio[alice.address].contains(0))
    
    scenario.h3('Test Alice attempt buying assets[4] with insufficient funds (Expect to fail)')
    # Can't be tested here: see https://gitlab.com/SmartPy/smartpy/-/issues/8
    #scenario.verify(token.data.balances[alice.address].balance == 1300)
    #scenario += assetsContract.buy(assetId = 4, buyer = alice.address).run(sender = alice, valid = True)
    #scenario.verify(token.data.balances[alice.address].balance == 1300)
    #scenario += token

    scenario.h3('Test Alice buys assets[1]')
    scenario += assetsContract.buy(asset = assets[1], buyer = alice.address).run(sender = originator)
    aliceBalanceExpected -= 200
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(assetsContract.data.ownership.contains(1))
    scenario.verify(assetsContract.data.ownership[1] == alice.address)
    scenario.verify(assetsContract.data.portfolio.contains(alice.address))
    scenario.verify(assetsContract.data.portfolio[alice.address].contains(1))
    
    scenario.h3('Test Alice pay amount per company')
    scenario += assetsContract.pay_amount_per(player = alice.address, amount = 120, per = "company").run(sender = originator)
    aliceBalanceExpected -= 240
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

    scenario.h3('Test Bob pay amount per company')
    scenario += assetsContract.pay_amount_per(player = bob.address, amount = 120, per = "company").run(sender = originator)
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)

    scenario.h3('Test Bob buys assets[1]')
    scenario += assetsContract.buy(asset = assets[1], buyer = bob.address).run(sender = originator)
    bobBalanceExpected -= 200
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    aliceBalanceExpected += 200
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(assetsContract.data.ownership.contains(1))
    scenario.verify(assetsContract.data.ownership[1] == bob.address)
    scenario.verify(assetsContract.data.portfolio.contains(bob.address))
    scenario.verify(assetsContract.data.portfolio[bob.address].contains(1))
    
    scenario.h3('Test Bob buys assets[1] again')
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario += assetsContract.buy(asset = assets[1], buyer = bob.address).run(sender = originator)
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.ownership.contains(1))
    scenario.verify(assetsContract.data.ownership[1] == bob.address)
    scenario.verify(assetsContract.data.portfolio.contains(bob.address))
    scenario.verify(assetsContract.data.portfolio[bob.address].contains(1))
    
    scenario.h3('Test Bob pays rent for assets[0]')
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario += assetsContract.pay_rent(asset = assets[0], player = bob.address).run(sender = bob)
    bobBalanceExpected -= 12
    aliceBalanceExpected += 12
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

    scenario.h3('Test Bob invest #1 in assets[1]')
    asset = assets[1]
    scenario += assetsContract.invest(asset = asset, player = bob.address).run(sender = bob)
    bobBalanceExpected -= 50
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.features.contains(asset.assetId))
    scenario.verify(assetsContract.data.features[asset.assetId] == 1)

    scenario.h3('Test Alice pays rent for assets[1]')
    asset = assets[1]
    scenario += assetsContract.pay_rent(asset = asset, player = alice.address).run(sender = alice)
    bobBalanceExpected += 36
    aliceBalanceExpected -= 36
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

    scenario.h3('Test Bob invest #2 in assets[1]')
    asset = assets[1]
    scenario += assetsContract.invest(asset = asset, player = bob.address).run(sender = bob)
    bobBalanceExpected -= 50
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.features.contains(asset.assetId))
    scenario.verify(assetsContract.data.features[asset.assetId] == 2)

    scenario.h3('Test Bob invest #3 in assets[1]')
    asset = assets[1]
    scenario += assetsContract.invest(asset = asset, player = bob.address).run(sender = originator)
    bobBalanceExpected -= 50
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.features.contains(asset.assetId))
    scenario.verify(assetsContract.data.features[asset.assetId] == 3)

    scenario.h3('Test Bob invest #4 in assets[1]')
    asset = assets[1]
    scenario += assetsContract.invest(asset = asset, player = bob.address).run(sender = bob)
    bobBalanceExpected -= 50
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.features.contains(asset.assetId))
    scenario.verify(assetsContract.data.features[asset.assetId] == 4)

    scenario.h3('Test Bob invest #5 in assets[1]')
    asset = assets[1]
    scenario += assetsContract.invest(asset = asset, player = bob.address).run(sender = bob)
    bobBalanceExpected -= 0
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.features.contains(asset.assetId))
    scenario.verify(assetsContract.data.features[asset.assetId] == 4)

    scenario.h3('Test Alice pays rent for assets[1]')
    asset = assets[1]
    scenario += assetsContract.pay_rent(asset = asset, player = alice.address).run(sender = originator)
    bobBalanceExpected += 600
    aliceBalanceExpected -= 600
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

#    scenario.h3('Test Bob withdraw from assets[1]')
#    assetId = 1
#    scenario += assetsContract.withdraw(assetId = assetId, player = bob.address).run(sender = bob)
#    bobBalanceExpected += 25
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(assetsContract.data.features.contains(assetId))
#    scenario.verify(assetsContract.data.features[assetId] == 3)

#    scenario.h3('Test Alice pays rent for assets[1]')
#    assetId = 1
#    scenario += assetsContract.pay_rent(assetId = assetId, player = alice.address).run(sender = alice)
#    bobBalanceExpected += 300
#    aliceBalanceExpected -= 300
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

#    scenario.h3('Test Alice withdraw from assets[0]')
#    assetId = 0
#    scenario.verify(~assetsContract.data.features.contains(assetId))
#    scenario += assetsContract.withdraw(assetId = assetId, player = alice.address).run(sender = alice)
#    aliceBalanceExpected += 0
#    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
#    scenario.verify(~assetsContract.data.features.contains(assetId))

#    scenario.h3('Test Bob withdraw from assets[1]')
#    assetId = 1
#    scenario += assetsContract.withdraw(assetId = assetId, player = bob.address).run(sender = bob)
#    bobBalanceExpected += 25
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(assetsContract.data.features.contains(assetId))
#    scenario.verify(assetsContract.data.features[assetId] == 2)

#    scenario.h3('Test Bob withdraw from assets[1]')
#    assetId = 1
#    scenario += assetsContract.withdraw(assetId = assetId, player = bob.address).run(sender = bob)
#    bobBalanceExpected += 25
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(assetsContract.data.features.contains(assetId))
#    scenario.verify(assetsContract.data.features[assetId] == 1)

#    scenario.h3('Test Bob withdraw from assets[1]')
#    assetId = 1
#    scenario += assetsContract.withdraw(assetId = assetId, player = bob.address).run(sender = bob)
#    bobBalanceExpected += 25
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(~assetsContract.data.features.contains(assetId))

#    scenario.h3('Test Alice pays rent for assets[1]')
#    assetId = 1
#    scenario += assetsContract.pay_rent(assetId = assetId, player = alice.address).run(sender = alice)
#    bobBalanceExpected += 12
#    aliceBalanceExpected -= 12
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

#    scenario.h3('Test Alice invest in assets[0]')
#    assetId = 0
#    scenario.verify(~assetsContract.data.features.contains(assetId))
#    scenario += assetsContract.invest(assetId = assetId, player = alice.address).run(sender = alice)
#    aliceBalanceExpected -= 50
#    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
#    scenario.verify(assetsContract.data.features.contains(assetId))
#    scenario.verify(assetsContract.data.features[assetId] == 1)

#    scenario.h3('Test Bob resell assets[0] (expect to fail)')
#    assetId = 0
#    scenario.verify(assetsContract.data.ownership[assetId] == alice.address)
#    scenario += assetsContract.resell(assetId = assetId, player = bob.address).run(sender = bob, valid = False)
#    scenario.verify(assetsContract.data.ownership[assetId] == alice.address)
#
#    scenario.h3('Test Alice resell assets[0]')
#    assetId = 0
#    scenario.verify(assetsContract.data.ownership.contains(assetId))
#    scenario.verify(assetsContract.data.ownership[assetId] == alice.address)
#    scenario.verify(assetsContract.data.portfolio.contains(alice.address))
#    scenario.verify(assetsContract.data.portfolio[alice.address].contains(assetId))
#    scenario += assetsContract.resell(assetId = assetId, player = alice.address).run(sender = alice)
#    aliceBalanceExpected += 175 # = (200 * 3 / 4) + (50 / 2)
#    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
#    scenario.verify(~assetsContract.data.features.contains(assetId))
#    scenario.verify(~assetsContract.data.ownership.contains(assetId))
#    scenario.verify(~assetsContract.data.portfolio.contains(alice.address))

#    scenario.h3('Test Bob resell assets[1]')
#    assetId = 1
#    scenario.verify(assetsContract.data.ownership.contains(assetId))
#    scenario.verify(assetsContract.data.ownership[assetId] == bob.address)
#    scenario.verify(assetsContract.data.portfolio.contains(bob.address))
#    scenario.verify(assetsContract.data.portfolio[bob.address].contains(assetId))
#    scenario += assetsContract.resell(assetId = assetId, player = bob.address).run(sender = bob)
#    bobBalanceExpected += 150 # = (200 * 3 / 4)
#    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
#    scenario.verify(~assetsContract.data.features.contains(assetId))
#    scenario.verify(~assetsContract.data.ownership.contains(assetId))
#    scenario.verify(~assetsContract.data.portfolio.contains(bob.address))

    scenario.h2("Reset game")
    scenario += contract.reset_start().run(sender = originator)
    scenario += assetsContract.reset().run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'resetting')
    scenario.verify(~token.data.balances.contains(alice.address))
    scenario.verify(~token.data.balances.contains(bob.address))
    scenario.verify(token.data.totalSupply == 0)
    scenario.verify(~assetsContract.data.ownership.contains(0))
    scenario.verify(~assetsContract.data.ownership.contains(1))
    scenario.verify(~assetsContract.data.portfolio.contains(alice.address))
    scenario.verify(~assetsContract.data.portfolio.contains(bob.address))

    scenario += contract.reset_complete().run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')
    
    scenario.h2("Test Chance Contract")

    scenario.h3("Start game again")
    scenario += contract.start(token = token.address, assets = assetsContract.address, initialBalance = 0).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayerIdx == 0)
    scenario.verify(contract.data.nextPlayer == alice.address)

    aliceBalanceExpected = 1500
    bobBalanceExpected = 1500
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(token.data.totalSupply == aliceBalanceExpected + bobBalanceExpected)
    scenario += token
    
    scenario.h3("Test game option 'move_n_spaces'")
    scenario += contract.move_n_spaces(player = alice.address, value = -5).run(sender = originator)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 19)

    scenario += contract.move_n_spaces(player = alice.address, value = 6).run(sender = originator)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 1)
    aliceBalanceExpected += 200
    scenario.verify(token.data.balances.get(alice.address).balance == aliceBalanceExpected)

    scenario += contract.move_n_spaces(player = alice.address, value = 23).run(sender = originator)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 0)
    aliceBalanceExpected += 200
    scenario.verify(token.data.balances.get(alice.address).balance == aliceBalanceExpected)

    scenario.h3("Reset game")
    scenario += contract.reset_start().run(sender = originator)
    scenario += assetsContract.reset().run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'resetting')
    scenario.verify(~token.data.balances.contains(alice.address))
    scenario.verify(~token.data.balances.contains(bob.address))
    scenario.verify(token.data.totalSupply == 0)
    scenario.verify(~assetsContract.data.ownership.contains(0))
    scenario.verify(~assetsContract.data.ownership.contains(1))
    scenario.verify(~assetsContract.data.portfolio.contains(alice.address))
    scenario.verify(~assetsContract.data.portfolio.contains(bob.address))

    scenario += contract.reset_complete().run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')
    scenario.verify(sp.len(contract.data.immunized) == 0)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 0)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 0)
    scenario.verify(sp.len(contract.data.quarantinePlayers) == 0)
    scenario.verify(contract.data.nbLaps == 0)

    scenario.h2("Start game again")
    scenario += contract.start(token = token.address, assets = assetsContract.address, initialBalance = 0).run(sender = originator)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayerIdx == 0)
    scenario.verify(contract.data.nextPlayer == alice.address)

    aliceBalanceExpected = 1500
    bobBalanceExpected = 1500
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(token.data.totalSupply == 3000)
    scenario += token
    
        # be sure the admin of assets contract is set to game contract before
    scenario.h3("Set game contract admin of Chance and Community contracts")
    scenario += chance.setAdministrator(admin = contract.address).run(sender = originator)
    scenario += community.setAdministrator(admin = contract.address).run(sender = originator)

    scenario.h2("Test register after game started (expect to fail)")
    scenario += contract.register().run(sender = charlie, valid = False)
    # Verify expected results
    scenario.verify(sp.len(contract.data.players) == 2)

    scenario.h2("Test play from Alice with wrong option (expect to fail)")
    payload = sp.record(dice1 = 1, dice2 = 3, newPosition = 4, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[4])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'CHANCE', payload = payload, signature = signature).run (sender = alice, valid = False)


    scenario.h2("Test play from Alice with wrong signature (expect to fail)")
    payload1 = sp.record(dice1 = 1, dice2 = 3, newPosition = 4, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[4])
    payload2 = sp.record(dice1 = 1, dice2 = 4, newPosition = 5, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[3])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload1))
    scenario += contract.play(option = 'NOTHING', payload = payload2, signature = signature).run (sender = alice, valid = False)

    scenario.h2("Test play from Alice with wrong newPosition (expect to fail)")
    payload = sp.record(dice1 = 1, dice2 = 3, newPosition = 11, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[1])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice, valid = False)
    
    scenario.p("expect nbLaps: 0")
    scenario.verify(contract.data.nbLaps == 0)

    scenario.h2("Test play NOTHING from Alice")
    payload = sp.record(dice1 = 5, dice2 = 6, newPosition = 11, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[1])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 11)

    scenario.h2("Test play from Alice again (expect to fail)")
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice, valid = False)
    scenario.verify(contract.data.nextPlayer == bob.address)
    
    scenario.p("expect nbLaps: 0")
    scenario.verify(contract.data.nbLaps == 0)

    scenario.h2("Test play STARTUP_FOUND asset #2 from Bob")
    payload = sp.record(dice1 = 6, dice2 = 6, newPosition = 12, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[2])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += assetsContract.play(option = 'STARTUP_FOUND', payload = payload, signature = signature).run (sender = bob)
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 12)
    bobBalanceExpected -= 200
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.portfolio[bob.address].contains(2))

    scenario.h2("Test play from Bob again (expect to fail)")
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = bob, valid = False)
    scenario.verify(contract.data.nextPlayer == alice.address)

    scenario.p("expect nbLaps: 1")
    scenario.verify(contract.data.nbLaps == 1)

    scenario.h2("Test play from Alice")
    payload = sp.record(dice1 = 5, dice2 = 6, newPosition = 22, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[3])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'NOTHING', payload = payload, signature = signature).run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 22)

    scenario.p("expect nbLaps: 1")
    scenario.verify(contract.data.nbLaps == 1)

    scenario.h2("Test play STARTUP_FOUND asset #0 from Bob")
    payload = sp.record(dice1 = 6, dice2 = 6, newPosition = 0, card = chances[0], options = sp.set(["NOTHING", "STARTUP_FOUND"]), asset = assets[0])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += assetsContract.play(option = 'STARTUP_FOUND', payload = payload, signature = signature).run (sender = bob)
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 0)
    bobBalanceExpected += 0 # +200 income -200 found statup
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.verify(assetsContract.data.portfolio[bob.address].contains(0))
    scenario.verify(sp.len(assetsContract.data.portfolio[bob.address].elements()) == 2)
    

    scenario.p("expect nbLaps: 2")
    scenario.verify(contract.data.nbLaps == 2)

    scenario.h2("Test play COVID from Alice")
    payload = sp.record(dice1 = 2, dice2 = 1, newPosition = 1, card = chances[0], options = sp.set(["COVID"]), asset = assets[4])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'COVID', payload = payload, signature = signature).run (sender = alice)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == contract.data.quarantineSpaceId)
    aliceBalanceExpected += 200
    scenario.verify(token.data.balances[alice.address].balance == aliceBalanceExpected)

    scenario.p("expect nbLaps: 2")
    scenario.verify(contract.data.nbLaps == 2)

    scenario.h2("Test play COMMUNITY_CHEST #1 from Bob")
    payload = sp.record(dice1 = 3, dice2 = 4, newPosition = 7, card = community_cards[1], options = sp.set(["COMMUNITY_CHEST"]), asset = assets[4])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'COMMUNITY_CHEST', payload = payload, signature = signature).run (sender = bob)
    bobBalanceExpected -= 2*110 # Bob owns 2 companies
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)

    scenario.p("Expected Bob can play again since Alice is in quarantine")
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 7)

    scenario.p("expect nbLaps: 3")
    scenario.verify(contract.data.nbLaps == 3)
    
    scenario.h2("Test play CHANCE from Bob, cardId=0:receive_amount")
    payload = sp.record(dice1 = 3, dice2 = 4, newPosition = 14, card = chances[0], options = sp.set(["CHANCE"]), asset = assets[4])
    signature = sp.make_signature(originator.secret_key, sp.pack(payload))
    scenario += contract.play(option = 'CHANCE', payload = payload, signature = signature).run (sender = bob)
    bobBalanceExpected += 100
    scenario.verify(token.data.balances[bob.address].balance == bobBalanceExpected)
    scenario.p("Alice is now free")
    scenario.verify(contract.data.nextPlayer == alice.address)
    scenario.verify(contract.data.playerPositions.get(bob.address) == 14)
    
    scenario.h2("Test force_next_player (rescue mode) from unauthorized user (expect to fail)")
    scenario.verify(contract.data.playerPositions.get(alice.address) == 12)
    scenario += contract.force_next_player(newPosition = 15, player = alice.address).run(sender = alice, valid = False)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 12)
    
    scenario.h2("Test force_next_player (rescue mode) for a wrong player (expect to fail)")
    scenario += contract.force_next_player(newPosition = 15, player = bob.address).run(sender = originator, valid = False)
    scenario.verify(contract.data.nextPlayer == alice.address)

    scenario.h2("Test force_next_player (rescue mode)")
    scenario += contract.force_next_player(newPosition = 15, player = alice.address).run(sender = originator)
    scenario.verify(contract.data.nextPlayer == bob.address)
    scenario.verify(contract.data.playerPositions.get(alice.address) == 15)
    
#    scenario.h2("Test play on ended game (expect to fail)")
#    scenario += contract.play().run (sender = alice, valid = False)
    
