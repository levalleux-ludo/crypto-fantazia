import smartpy as sp

def call(c, x):
    sp.transfer(x, sp.mutez(0), c)

class FakeGameContract(sp.Contract):
    def __init__(self, quarantineSpaceId):
        self.init(
            immunized = sp.set(t = sp.TAddress),
            nbSpaces = sp.to_int(24),
            playerPositions = sp.map(tkey = sp.TAddress, tvalue = sp.TInt),
            quarantineSpaceId = quarantineSpaceId,
            callToken = False,
            lapIncome = 200
        )

    @sp.entry_point
    def give_immunity(self, params):
        sp.if ~self.data.immunized.contains(params.player):
            self.data.immunized.add(params.player)
            
    @sp.entry_point
    def put_in_quarantine(self, params):
        sp.if ~self.data.immunized.contains(params.player):
            self.setPlayerPosition(params.player, self.data.quarantineSpaceId)

    @sp.entry_point
    def move_n_spaces(self, params):
        newPosition = sp.local("newPosition", self.getPlayerPosition(params.player))
        newPosition.value += params.value
        self.data.callToken = False
        sp.if newPosition.value >= self.data.nbSpaces :
            newPosition.value -= self.data.nbSpaces
            # TODO: call token contract to give player lap income
            self.data.callToken = True
            self.givePlayerLapIncome(params.player, params.token)
            #self.testCallToken(params.token)
        sp.if newPosition.value < 0 :
            newPosition.value += self.data.nbSpaces
        self.setPlayerPosition(params.player, newPosition.value)

    @sp.entry_point
    def go_to_space(self, params):
        oldPosition = sp.local("oldPosition", self.getPlayerPosition(params.player))
        self.setPlayerPosition(params.player, params.value)
        newPosition = sp.local("newPosition", self.getPlayerPosition(params.player))
        self.data.callToken = False
        sp.if newPosition.value < oldPosition.value :
            # TODO: call token contract to give player lap income
            self.data.callToken = True
            self.givePlayerLapIncome(params.player, params.token)
            #self.testCallToken(params.token)

    @sp.entry_point
    def pay_amount(self, params):
        self.token_burn(params.token, params.player, params.value)
        
    @sp.entry_point
    def receive_amount(self, params):
        self.token_mint(params.token, params.player, params.value)

    def setPlayerPosition(self, player, position):
        self.data.playerPositions[player] = position
    
    def getPlayerPosition(self, player):
        sp.if ~self.data.playerPositions.contains(player):
            self.data.playerPositions[player] = 0
        return self.data.playerPositions[player];
        
    def givePlayerLapIncome(self, player, token):
        self.token_mint(token, player, self.data.lapIncome)

    def testCallToken(self, token):
        sp.set_type(token, sp.TAddress)
        # h_setCaller: handle to the 'setCaller' entry_point of the token contract
        h_setCaller = sp.contract(sp.TUnit, token, entry_point = "setCaller").open_some()
        param = sp.unit
        call(h_setCaller, param)
        
    def token_burn(self, token, address, amount):
        # tk : type of params expected by 'burn' entry_point
        tk = sp.TRecord(address = sp.TAddress, amount = sp.TNat)
        # h_burn: handle to the 'burn' entry_point of the token contract
        h_burn = sp.contract(tk, token, entry_point = "burn").open_some()
        param = sp.record(address = address, amount = sp.as_nat(amount))
        call(h_burn, param)
        
    def token_mint(self, token, to, value):
        # tk : type of params expected by 'mint' entry_point
        tk = sp.TRecord(to = sp.TAddress, value = sp.TNat)
        # h_mint: handle to the 'mint' entry_point of the token contract
        h_mint = sp.contract(tk, token, entry_point = "mint").open_some()
        param = sp.record(to = to, value = sp.as_nat(value))
        call(h_mint, param)
        



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
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt, token = sp.TAddress)
            # h_receive_amount: handle to the 'receive_amount' entry_point of the GamedContract
            h_receive_amount = sp.contract(tk, self.data.gameContract, entry_point = "receive_amount").open_some()
            param = sp.record(player = params.player, value = chance.param, token = self.data.tokenContract)
            call(h_receive_amount, param)            
        sp.if chance.type == 'pay_amount':
            # tk : type of params expected by 'pay_amount' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt, token = sp.TAddress)
            # h_pay_amount: handle to the 'pay_amount' entry_point of the GamedContract
            h_pay_amount = sp.contract(tk, self.data.gameContract, entry_point = "pay_amount").open_some()
            param = sp.record(player = params.player, value = chance.param, token = self.data.tokenContract)
            call(h_pay_amount, param)
        sp.if chance.type == 'go_to_space':
            # tk : type of params expected by 'go_to_space' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt, token = sp.TAddress)
            # h_go_to_space: handle to the 'go_to_space' entry_point of the GamedContract
            h_go_to_space = sp.contract(tk, self.data.gameContract, entry_point = "go_to_space").open_some()
            param = sp.record(player = params.player, value = chance.param, token = self.data.tokenContract)
            call(h_go_to_space, param)
        sp.if chance.type == 'move_n_spaces':
            # tk : type of params expected by 'move_n_spaces' entry_point
            tk = sp.TRecord(player = sp.TAddress, value = sp.TInt, token = sp.TAddress)
            # h_give_immunity: handle to the 'move_n_spaces' entry_point of the GamedContract
            h_move_n_spaces = sp.contract(tk, self.data.gameContract, entry_point = "move_n_spaces").open_some()
            param = sp.record(player = params.player, value = chance.param, token = self.data.tokenContract)
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


@sp.add_test(name = "TestModulo Tests")
def test1():
    scenario = sp.test_scenario()
    scenario.h1("TestModulo test")
    admin   = sp.test_account('God')
    alice   = sp.test_account('Alice')
    bob   = sp.test_account('Bob')
    charlie   = sp.test_account('Charlie')
    quarantineSpaceId = 12
    
    game = FakeGameContract(quarantineSpaceId)

    scenario.h2("Test FakeTokenContract")

    token = FakeTokenContract(game.address)
    scenario += token

    scenario.h2("Test FakeGameContract")

    scenario += game
    scenario.verify(~game.data.playerPositions.contains(alice.address))
    
    scenario += game.move_n_spaces(player = alice.address, value = -5, token = token.address)
    scenario.verify(game.data.playerPositions.get(alice.address) == 19)
    scenario.verify(game.data.callToken == False)
    scenario.verify(~token.data.balances.contains(alice.address))

    scenario += game.move_n_spaces(player = alice.address, value = 6, token = token.address)
    scenario.verify(game.data.playerPositions.get(alice.address) == 1)
    scenario.verify(game.data.callToken == True)
    scenario.verify(token.data.balances.get(alice.address).balance == 200)

    scenario += game.move_n_spaces(player = alice.address, value = 23, token = token.address)
    scenario.verify(game.data.playerPositions.get(alice.address) == 0)
    scenario.verify(game.data.callToken == True)
    scenario.verify(token.data.balances.get(alice.address).balance == 400)


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
    
    chance = ChanceContract(admin.address, chances)
    scenario += chance
    
    scenario.h3("set game contract address")
    scenario += chance.setGameContract(address = game.address)
    scenario.verify(chance.data.gameContract == game.address)

    scenario.h3("set token contract address")
    scenario += chance.setTokenContract(address = token.address)
    scenario.verify(chance.data.tokenContract == token.address)

    scenario.h3("test perform chance of type covid_immunity")
    scenario.verify(~game.data.immunized.contains(alice.address))
    scenario += chance.perform(chanceId = 4, player = alice.address)
    scenario.verify(game.data.immunized.contains(alice.address))

    scenario.h3("test perform chance of type move_n_spaces")
    scenario += chance.perform(chanceId = 3, player = bob.address)
    scenario.verify(game.data.playerPositions.get(bob.address) == 21)
    scenario.verify(game.data.callToken == False)

    scenario.h3("test perform chance of type move_n_spaces passing through Genesis Block")
    scenario += chance.perform(chanceId = 7, player = bob.address)
    scenario.verify(game.data.playerPositions.get(bob.address) == 0)
    scenario.verify(game.data.callToken == True)
    
    scenario.h3("test perform chance of type go_to_quarantine")
    scenario += chance.perform(chanceId = 5, player = bob.address)
    scenario.verify(game.data.playerPositions.get(bob.address) == quarantineSpaceId)

    scenario.h3("test perform chance of type go_to_quarantine for immunized player")
    scenario.verify(game.data.playerPositions.get(alice.address) == 0)
    scenario += chance.perform(chanceId = 5, player = alice.address)
    scenario.verify(game.data.playerPositions.get(alice.address) == 0)
    
    # TODO: verify that bob can not play until next lap

    scenario.h3("test perform chance of type go_to_space")
    scenario += chance.perform(chanceId = 2, player = alice.address)
    scenario.verify(game.data.playerPositions.get(alice.address) == 15)
    scenario.verify(game.data.callToken == False)
    scenario.verify(token.data.balances.get(alice.address).balance == 400)

    scenario.h3("test perform chance of type go_to_space passing through Genesis Block")
    scenario += chance.perform(chanceId = 6, player = alice.address)
    scenario.verify(game.data.playerPositions.get(alice.address) == 14)
    scenario.verify(game.data.callToken == True)
    scenario.verify(token.data.balances.get(alice.address).balance == 600)

    scenario.h3("test perform chance of type pay_amount")
    scenario += chance.perform(chanceId = 1, player = alice.address)
    scenario.verify(token.data.balances.get(alice.address).balance == 500)

    scenario.h3("test perform chance of type receive_amount")
    scenario.verify(token.data.balances.get(bob.address).balance == 200)
    scenario += chance.perform(chanceId = 0, player = bob.address)
    scenario.verify(token.data.balances.get(bob.address).balance == 300)



