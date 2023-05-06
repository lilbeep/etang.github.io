const Betting = artifacts.require("Betting");

contract("Betting", (accounts) => {
  let instance;

  beforeEach(async () => {
    instance = await Betting.new();
    await instance.setName("TesterA",{from: accounts[1]});
    await instance.setName("TesterA",{from: accounts[2]});
  });

  it("should start a betting session", async () => {
    await instance.startSession({ from: accounts[0] });
    const bettingSessionStarted = await instance.bettingSessionStarted();
    assert.equal(bettingSessionStarted, true);
  });

  it("should start a round", async () => {
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("New Competitor 1", "New Competitor 2", { from: accounts[0] });
    const competitor1 = await instance.competitor1();
    const competitor2 = await instance.competitor2();
    assert.equal(competitor1, "New Competitor 1");
    assert.equal(competitor2, "New Competitor 2");
    const roundStarted = await instance.roundStarted();
    assert.equal(roundStarted, true);
  });

  it("should place a bet", async () => {
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("New Competitor 1", "New Competitor 2", { from: accounts[0] });
    await instance.placeBet(1, 50, { from: accounts[1] });
    const bettor = await instance.bettors(0);
    assert.equal(bettor.balance, 50);
    assert.equal(bettor.wins, 0);
    assert.equal(bettor.active, true);
    const bet = await instance.bets(0);
    assert.equal(bet.bettor.Address, bettor.Address);
    assert.equal(bet.amount, 50);
    assert.equal(bet.competitor, 1);
  });

  it("should lock bets", async () => {
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("New Competitor 1", "New Competitor 2", { from: accounts[0] });
    await instance.lockBets({ from: accounts[0] });
    const bettingLocked = await instance.bettingLocked();
    assert.equal(bettingLocked, true);
  });

  it("should not allow bets to be placed after betting is locked", async () => {
    // Start a session and round
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("Competitor 1", "Competitor 2", { from: accounts[0] });
  
    // Lock the bets
    await instance.lockBets({ from: accounts[0] });
  
    // Attempt to place a bet after betting is locked
    try {
      await instance.placeBet(1, 50, { from: accounts[1] });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Expected revert not received");
    }
  });
  

  it("should complete a round", async () => {
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("Competitor 1", "Competitor 2", { from: accounts[0] });
    await instance.completeRound(1, { from: accounts[0] });
    const winner = await instance.winner();
    assert.equal(winner, 1);
    const roundCounter = await instance.roundCounter();
    assert.equal(roundCounter, 1);
  });

  it('should correctly settle winning bets', async () => {
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("New Competitor 1", "New Competitor 2", { from: accounts[0] });

    // Place two bets on competitor1
    await instance.placeBet(1, 50, { from: accounts[1]});
    await instance.placeBet(2, 50, { from: accounts[2]});

    // Lock betting
    await instance.lockBets({from: accounts[0]});
  
    // Complete round and settle bets
    await instance.completeRound(1, {from: accounts[0] });
    await instance.settleBets({from:accounts[0]});

    // Check balances
    const balance1 = await instance.getBettorBalance(accounts[1]);
    const balance2 = await instance.getBettorBalance(accounts[2]);
    const expectedBalance1 = 150;
    const expectedBalance2 = 50;
  
    assert.equal(balance1.toString(), expectedBalance1.toString(), 'Bettor1 did not receive correct payout');
    assert.equal(balance2.toString(), expectedBalance2.toString(), 'Bettor2 did not receive correct payout');
  });
  
  it('should not allow settleBets to be called before round is completed', async () => {
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("New Competitor 1", "New Competitor 2", { from: accounts[0] });

  
    // Place a bet
    await instance.placeBet(1, 50,{ from: accounts[1] });
  
    // Lock betting, but don't complete round
    await instance.lockBets({from: accounts[0]});
  
    // Try to settle bets
    try {
      await instance.settleBets({from: accounts[0]});
      assert.fail('Expected revert not received');
    } catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'Expected revert not received');
    }
  });

  it("should refund bets", async () => {
    // Place bets for the round
    await instance.startSession({ from: accounts[0] });
    await instance.startRound("New Competitor 1", "New Competitor 2", { from: accounts[0] });
    await instance.placeBet(1, 50, {from: accounts[1]});
    await instance.placeBet(2, 50, {from: accounts[2]});

    // Refund bets
    await instance.refundBets();

    const balance1 = await instance.getBettorBalance(accounts[1]);
    const balance2 = await instance.getBettorBalance(accounts[2]);
    const expectedBalance = 100;
    assert.equal(balance1.toString(), expectedBalance.toString(), 'Bettor 1 balance was not refunded');
    assert.equal(balance2.toString(), expectedBalance.toString(), 'Bettor 2 balance was not refunded');
  });
  
  
})