import smartpy as sp

class GameContract(sp.Contract):
    def __init__(self, originator_address, originator_pubKey, creator_address):
        sp.set_type(originator_address, sp.TAddress)
        sp.set_type(originator_pubKey, sp.TKey)
        sp.set_type(creator_address, sp.TAddress)
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
        sp.verify(sp.sender == self.data.creator, 'Only game creator is allowed to start game')
        self.data.status = 'started'
        self.findNextPlayer()
    
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
        self.findNextPlayer()

    def findNextPlayer(self):
        nbPlayers = sp.to_int(sp.len(self.data.players))
        self.data.nextPlayerIdx = sp.to_int((self.data.nextPlayerIdx + 1) % nbPlayers)
        self.data.nextPlayer = self.data.players[self.data.nextPlayerIdx]

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
    
    scenario.h2("Test play on not started game (expect to fail)")
    scenario += contract.play().run (sender = alice, valid = False)
    
    scenario.h2("Test start game from unauthorized user (expect to fail)")
    scenario += contract.start().run(sender = bob, valid = False)
    # Verify expected results
    scenario.verify(contract.data.status == 'created')

    scenario.h2("Test start game")
    scenario += contract.start().run(sender = alice)
    # Verify expected results
    scenario.verify(contract.data.status == 'started')
    scenario.verify(contract.data.nextPlayer == alice.address)
    
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
