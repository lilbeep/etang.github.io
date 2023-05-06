// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";


contract Betting {

    using SafeMath for uint;

    string public competitor1;
    string public competitor2;
    int public winner;
    int public roundCounter;
    bool public bettingSessionStarted;
    bool public roundStarted;
    bool public bettingLocked;
    uint256 public competitor1TotalBets;
    uint256 public competitor2TotalBets;
    int public bettorCount;


    struct Bet {
        Bettor bettor;
        uint amount;
        int competitor;
        
    }
    struct Bettor {
        uint balance;
        bool active;
        uint wins;
        address Address;
        string name;
        
    }

    Bet[] public bets;
    Bettor[] public bettors;

    address public admin;

    constructor() public {
        admin = msg.sender;
        bettorCount = 0;
        bettingSessionStarted = false;
        roundStarted = false;
        bettingLocked = false;
        competitor1TotalBets = 0;
        competitor2TotalBets = 0;
        winner = 0;
    }

    modifier onlyAdmin {
        require(msg.sender == admin, "Only the admin can call this function");
        _;
    }

    function startSession() public onlyAdmin {
        require(winner == 0, "Round not yet completed");
        bettingSessionStarted = true;
        roundCounter = 0;
    }

    function startRound(string memory _competitor1, string memory _competitor2) public onlyAdmin {
        require(bettingSessionStarted, "Session not yet Started");
        require(bytes(_competitor1).length > 0 && bytes(_competitor1).length <= 50, "Invalid competitor 1 name");
        require(bytes(_competitor2).length > 0 && bytes(_competitor2).length <= 50, "Invalid competitor 2 name");
        require(winner == 0, "Round not yet completed");

        competitor1 = _competitor1;
        competitor2 = _competitor2;
        roundStarted = true;
        competitor1TotalBets = 0;
        competitor2TotalBets = 0;
        delete bets;
        bettingLocked = false;
        roundCounter++;
    }
    
    function setName(string memory _name) public {
        require(bytes(_name).length >= 2 && bytes(_name).length <= 12, "Name must be between 2 and 12 characters long" );

        // If bettor doesn't exist then create the Bettor and add to array
        if (!bettorCheck(msg.sender)) {
            bettorCount ++;
            bettors.push(Bettor({
                Address: msg.sender,
                balance: 100,
                wins: 0,
                active: true,
                name: _name
            }));
        }else{
            bettors[getBettor(msg.sender)].name = _name;
        }
        
    }


    function placeBet(int _competitor, uint _betAmount) public payable {
        require(getBettorBalance(payable(msg.sender)) > _betAmount, "Not enough funds ");
        require(roundStarted == true, "Round has not started yet");
        require(bettingLocked == false, "Betting is locked, wait till next round");
        require(_betAmount > 0 && _betAmount <= msg.sender.balance, "Bet must be greater than 0 but less than 100!");
        require(msg.sender != address(this), "Cannot bet from contract address");
        require(_competitor > 0 && _competitor <= 2, "Bet must be greater than 0 but less than 100!");
        require(bettorCheck(msg.sender), "Please chose your name before betting");


        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].bettor.Address == msg.sender) {
                bets[i].amount = _betAmount;
                bets[i].competitor = _competitor;
                bets[i].bettor.balance -= _betAmount;
                emit BetPlaced(msg.sender, _betAmount, _competitor,bets[i].bettor.balance);
                return;
            }
        }

        bets.push(Bet({
            bettor: bettors[getBettor(msg.sender)],
            amount: _betAmount,
            competitor: _competitor
        }));
        bettors[getBettor(msg.sender)].balance -= _betAmount;
        emit BetPlaced(msg.sender, _betAmount, _competitor, getBettorBalance(msg.sender));
        if (_competitor == 1) {
            competitor1TotalBets += _betAmount;
        } else {
            competitor2TotalBets += _betAmount;
        }
    }

    function lockBets() public onlyAdmin {
        require(roundStarted == true, "Round has not started yet");
        bettingLocked = true;
    }

    function completeRound(int _winner) public onlyAdmin {
        require(_winner == 1 || _winner == 2, "Invalid competitor");
        require(winner == 0, "Round already completed");
        require(roundStarted == true, "Round has not started yet");

        winner = _winner;
    }

    function settleBets() public onlyAdmin {
        require(winner != 0, "Round not yet completed");

        uint totalAmountWinning = 0;
        uint totalAmountLosing = 0;
        Bet[] memory winningBets = new Bet[](bets.length);

        // Create an array of all bets that were placed on the winner and add up the total amount placed on the loser and the winner
        uint numWinningBets = 0;
        for (uint i = 0; i < bets.length; i++) {
            if (bets[i].competitor == winner) {
                winningBets[numWinningBets] = bets[i];
                numWinningBets++;
                totalAmountWinning += bets[i].amount;
                bets[i].bettor.wins++;
            } else {
                totalAmountLosing += bets[i].amount;
            }
        }

        // Calculate the total amount of money won by the winning bettors
        uint totalPool = totalAmountLosing + totalAmountWinning;
        for (uint i = 0; i < numWinningBets; i++) {
            // Calculate the amount to transfer to the bettor
            uint instBettor = getBettor(winningBets[i].bettor.Address);
            bettors[instBettor].balance += ((totalAmountWinning / winningBets[i].amount) * totalPool);
            bettors[instBettor].wins += 1;
        }
        winner = 0;
    }


    function refundBets() public onlyAdmin {
        require(winner == 0, "Round already completed");
        require(roundStarted == true, "Round has not started yet");

        for (uint i = 0; i < bets.length; i++) {
            bettors[getBettor(bets[i].bettor.Address)].balance += bets[i].amount;
            bets[i].amount = 0;
        }
        winner = 0;
    }

    // Assisting functions

    function getBettorBalance(address bettorAddress) public view returns (uint) {
        for (uint i = 0; i < bettors.length; i++) {
            if (bettors[i].Address == bettorAddress) {
                return bettors[i].balance;
            }
        }
        // If the address is not found, return 0
        return 0;
    }
    function getBettorName(address bettorAddress) public view returns (string memory) {
        for (uint i = 0; i < bettors.length; i++) {
            if (bettors[i].Address == bettorAddress) {
                return bettors[i].name;
            }
        }
        // If the bettor is not found, return N/A
        return "N/A";
    }
    function getBettor(address bettorAddress) public view returns (uint) {
        for (uint i = 0; i < bettors.length; i++) {
            if (bettors[i].Address == bettorAddress) {
                // If bettor is found, return the bettor's place in array
                return i;
            }
        }
        // If the bettor is not found, revert
        revert("Bettor not found");
    }
    function bettorCheck(address bettorAddress) public view returns (bool) {
        for (uint i = 0; i < bettors.length; i++) {
            if (bettors[i].Address == bettorAddress) {
                return true;
            }
        }
        // If the address is not found, return false
        return false;

    }


    event BetPlaced(address bettor, uint amount, int competitor, uint balanceofbettor);
    event BettorCreated(uint balance, bool active, uint wins, address Address, string name);
}



