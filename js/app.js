App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: function() {
    // initialize the web3 provider
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('HTTP://127.0.0.1:7545');
      web3 = new Web3(App.web3Provider);
    }
    // initialize the contract
    return App.initContract();
  },

  initContract: function() {
    $.getJSON('build/contracts/Betting.json', function(betting) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      App.contracts.Betting = TruffleContract(betting);
  
      // Set the provider for our contract
      App.contracts.Betting.setProvider(App.web3Provider);
  
      // render the page
      App.render();
    });
  },
  
  listenForEvents: function() {
    App.contracts.Betting.deployed().then(function(instance) {
      instance.placeBet({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new bet is recorded
        App.render();
      });
    });
  },

  render: function() {

    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // get the betting session status element and update its value
    var bettingSessionStatus = document.getElementById("betting-session-status");
    App.contracts.Betting.deployed().then(function(instance) {
      return instance.bettingSessionStarted();
    }).then(function(result) {
      bettingSessionStatus.innerHTML = result;
    }).catch(function(err) {
      console.log(err.message);
    });
  
    // get the round status element and update its value
    var roundStatus = document.getElementById("round-status");
    App.contracts.Betting.deployed().then(function(instance) {
      return instance.roundStarted();
    }).then(function(result) {
      roundStatus.innerHTML = result;
    }).catch(function(err) {
      console.log(err.message);
    });

    

    // get the competitor names and update the HTML elements
    var competitor1Name = document.getElementById("competitor1Name");
    var competitor2Name = document.getElementById("competitor2Name");
    var userNameDisplay = document.getElementById('user-name-display');
        

    App.contracts.Betting.deployed().then(function(instance) {
      return Promise.all([
        instance.competitor1(),
        instance.competitor2(),
        instance.getBettorName(App.account)
      ]);
    }).then(function(results) {
      competitor1Name.innerHTML = results[0];
      competitor2Name.innerHTML = results[1];
      userNameDisplay.innerHTML = results[2];
    }).catch(function(err) {
      console.log(err.message);
    });

    // get the total bets amount for competitor 1 and update the HTML element
    var competitor1TotalBets = document.getElementById("competitor1-bet-amount");
    App.contracts.Betting.deployed().then(function(instance) {
      return instance.competitor1TotalBets();
    }).then(function(result) {
      competitor1TotalBets.innerHTML = result.toString();
    }).catch(function(err) {
      console.log(err.message);
    });

    // get the total bets amount for competitor 2 and update the HTML element
    var competitor2TotalBets = document.getElementById("competitor2-bet-amount");
    App.contracts.Betting.deployed().then(function(instance) {
      return instance.competitor2TotalBets();
    }).then(function(result) {
      competitor2TotalBets.innerHTML = result.toString();
    }).catch(function(err) {
      console.log(err.message);
    });

    console.log("here");
    var candidatesResults = $("#leaderboard");
    candidatesResults.empty();
    console.log("here2");
    App.contracts.Betting.deployed().then(function(instance) {
      instance.bettorCount().then(function(bettorCount) {
        console.log("here3");
    
        // Initialize an empty array to store the bettors
        var bettors = [];
    
        // Loop through all the bettors and push them into the array
        for (var i = 0; i < bettorCount.toNumber(); i++) {
          instance.bettors(i).then(function(bettor) {
            console.log("here4")
            var name = bettor[4];
            var balance = bettor[0].toNumber();
    
            // Push the bettor object with its name and balance into the array
            bettors.push({ name: name, balance: balance });
            console.log(bettors.length);
            console.log(bettorCount.toNumber());
            // If all the bettors have been pushed into the array, sort it and render the leaderboard
            if (bettors.length === bettorCount.toNumber()) {
              console.log("here5")
              // Sort the bettors array in descending order based on balance
              bettors.sort(function(a, b) {
                return b.balance - a.balance;
              });
              console.log("here5")
              // Render the leaderboard with the sorted bettors
              for (var j = 0; j < bettors.length; j++) {
                var id = (j + 1);
                var name = bettors[j].name;
                var balance = bettors[j].balance;
                var boardTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + balance + "</td></tr>"
                candidatesResults.append(boardTemplate);
              }
            }
          });
        }
      });
    });
    

    // bind the click event to the Make Bet button
    var makeBetButton = document.getElementById("make-bet-button");
    makeBetButton.addEventListener("click", function() {
      console.log("Make bet button clicked");

      // check if a round and betting session are started
      App.contracts.Betting.deployed().then(function(instance) {
        return Promise.all([instance.roundStarted(), instance.bettingSessionStarted()]);
      }).then(function(results) {
        var roundStarted = results[0];
        var bettingSessionStarted = results[1];
        
        if (!roundStarted) {
          alert("Cannot make a bet until the round has started.");
          return;
        }

        if (!bettingSessionStarted) {
          alert("Cannot make a bet until the betting session has started.");
          return;
        }

        // get the bet amount and competitor selection from the form
        var betAmount = $("#bet-amount").val();
        var competitor = $("#bet-competitor").val();

        // check if the bet amount is a valid number
        if (isNaN(betAmount) || betAmount == "" || betAmount == 0) {
          alert("Please enter a valid bet amount.");
          return;
        }
        

        // call the placeBet function in the smart contract
        App.contracts.Betting.deployed().then(function(instance) {
          return instance.placeBet(competitor,betAmount, {from: App.account});
        }).then(function(result) {
          // refresh the page after the bet is made
          App.render();
        }).catch(function(err) {
          console.log(err.message);
        });
      });
    });

    

    // bind the click event to the submit name button
    var nameButton = document.getElementById("submit-name");
    nameButton.addEventListener("click", function() {
      console.log("Set name button clicked");

      // get the name from the form
      var nameChose = $("#user-name").val();

      // check if the name is a valid length
      if (nameChose.length < 2 && nameChose.length > 12) {
        alert("Name must be between 2 and 12 characters!");
        return;
      }

      // call the setName function in the smart contract
      App.contracts.Betting.deployed().then(function(instance) {
        return instance.setName(nameChose, {from: App.account});
      }).then(function(result) {
        // refresh the page after the name is sent
        App.render();
      }).catch(function(err) {
        console.log(err.message);
      });
    });

    
  },
  
};

// initialize the app
App.init();
