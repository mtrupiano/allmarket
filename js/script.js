$(document).ready(function() {

    // Initialize materialize tabs
    $(".tabs").tabs();

    // Load watch list from local storage
    if (localStorage.getItem("watchList")) {
        var watchList = JSON.parse(localStorage.getItem("watchList"));
    } else {
        var watchList = [];
        localStorage.setItem("watchList", JSON.stringify(watchList));
    }

    // Load user's available funds
    if (localStorage.getItem("availableFunds")) {
        var availableFunds = JSON.parse(localStorage.getItem("availableFunds"));
    } else {
        var availableFunds = 2000;
        localStorage.setItem("availableFunds", availableFunds);
    }

    // Load list of owned currencies
    if (localStorage.getItem("ownedCurrencies")) {
        var ownedCurrencies = JSON.parse(localStorage.getItem("ownedCurrencies"));
    } else {
        var ownedCurrencies = [];
    }

    var selectedCoin;

    // Elements of chart area
    var chartAreaBtnGroup = $("#buy-sell-watch-group");
    var chartAreaCloseBtn = $("#chart-close-btn");
    
    // Elements of buy/sell modal form
    var modalForm =                 $("#buysell-form");
    var executeTransactionButton =  $("#purchase-sell-btn");
    var pricePerDisplay =           $("#price-value");
    var availableFundsDisplay =     $("#available-funds-display");
    var quantityField =             $("#quantity");
    var totalPriceDisplay =         $("#total-price-display");
    var loadingAlertMsg =           $("#loading-alert");
    var insufficientFundsAlert =    $("#alert-insuf-funds");
    var quantityZeroAlert =         $("#alert-qty-zero");

    var coinLoreURL = "https://api.coinlore.net/api/tickers/";
    var key = "1D8CF151-75D6-407B-BD64-253F4241EFEE/";

    var cryptoCompareKey = "f4b9e28c75f0678a37042564fa90fd5214aa232b975d626b838a5f4a526ac605";

    var nomicsKey = "fa8abceb3eb222b8e323180022446677";
    var nomicsURL = "https://api.nomics.com/v1/currencies?key=" + nomicsKey + "&ids=BTC,ETH,XRP&attributes=id,name,logo_url";

    /**
     * Render full currency table when 'Coins' tab is clicked
     */
    $("a[href='#coins-view']").click(function(event) {
        // Empty table
        var tbodyEl = $("div#coins-view tbody");
        tbodyEl.text("");

        $.ajax({
            url: coinLoreURL,
            method: "GET"
        }).then(function(response) {
            var responseArr = response.data;
            for (var i = 0; i < response.data.length; i++) {
                var element = responseArr[i];

                var newTableRow = $("<tr>");
                newTableRow.attr("data-crypto-id", element.id);
                newTableRow.append($("<td>").text(element.symbol));
                newTableRow.append($("<td>").text(element.name));
                newTableRow.append($("<td>").text(element.price_usd));
                tbodyEl.append(newTableRow);
            }

            // Event listener for selecting a cryptocurrency from the presented table
            tbodyEl.click(function (event) {
                event.preventDefault();
                
                // Get selected table row from event
                var target = $(event.target);
                var selectedRow = target.parent();

                // Remove highlight from any previously selected row
                ($("tbody").find(".active")).removeClass("active");
                // Add highlight to selected row
                selectedRow.addClass("active");

                // Extract coin symbol and name from selected row
                var symbol = $(selectedRow.children()[0]).text();
                var name = $(selectedRow.children()[1]).text();
                var cryptoId = selectedRow.attr("data-crypto-id");
                selectedCoin = { symbol: symbol, name: name, id: cryptoId };

                // Add coin symbol and name as headers in chart area
                $("#coin-chart-header").children("h3").text(symbol);
                $("#coin-chart-header").children("h4").text(name);

                // Shrink table to the left of the page
                var coinsViewEl = $("#coins-view");
                coinsViewEl.removeClass("container");
                coinsViewEl.removeClass("s12");
                coinsViewEl.addClass("s6");

                // Submit API request to CryptoCompare for history of selected coin's value
                var cryptoCompareURL = 
                    `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareKey}`;
                $.ajax({
                    url: cryptoCompareURL,
                    method: "GET"
                }).then(function (response) {
                    console.log(response);
                });

                // Un-hide the chart area div
                $("#chart-div").attr("style", "");

                // Disable 'Sell' button if user does not own any of this currency
                if (!ownedCurrencies.find(e => e.id === selectedCoin.id) ||
                    (ownedCurrencies.find(e => e.id === selectedCoin.id)).ownedQuantity === 0) {
                    $(".sell-btn").addClass("disabled");
                } else {
                    $(".sell-btn").removeClass("disabled");
                }

            });

        });
    });

    /**
     * Render owned and watching tables when 'My Wallet' tab is clicked
     */
    $("a[href='#wallet-view']").click(function (event) {
        resetChartArea();
        
        var ownedTbodyEl = $("#owned tbody");
        ownedTbodyEl.text("");
        if (ownedCurrencies.length === 0) {
            // Show message in table area saying "You don't own any currencies"
        } else {
            for (var i = 0; i < ownedCurrencies.length; i++) {
                var element = ownedCurrencies[i];
                if (element.ownedQuantity !== 0) {
                    var newTableRow = $("<tr>");
                    newTableRow.attr("data-crypto-id", element.id);
                    newTableRow.append($("<td>").text(element.symbol));
                    newTableRow.append($("<td>").text(element.name));
                    newTableRow.append($("<td>").text(element.ownedQuantity.toFixed(2)));
                    newTableRow.append($("<td>").text(element.currentEquity.toFixed(2)));
                    ownedTbodyEl.append(newTableRow);
                }
            }
        }

        var watchingTbodyEl = $("#watching tbody");
        watchingTbodyEl.text(""); // Clear watching table
        if (watchList.length === 0) {
            // Show message in table body saying "You're not currently watching any currencies!"
        } else {
            var quotesStr = "";
            for (var i = 0; i < watchList.length; i++) {
                var newTableRow = $("<tr>");
                newTableRow.attr("data-crypto-id", watchList[i].id);
                newTableRow.append($("<td>").text(watchList[i].symbol));
                newTableRow.append($("<td>").text(watchList[i].name));
                newTableRow.append($("<td>").text(""))
                watchingTbodyEl.append(newTableRow);
            }
        }
    });

    /**
     * Take appropriate action when button in 'buy-sell-watch-group' is clicked
     */
    chartAreaBtnGroup.click(function (event) {
        event.preventDefault();

        var target = $(event.target);
        if (target.text() !== "WATCH") {
            loadBuyOrSellModal(target.text(), selectedCoin);
        } else {
            addToWatchList(selectedCoin);
        }
    });

    /** 
     * Load modal pane content for buying or selling a currency
     * 
     * @param                       method          BUY or SELL (dictates content presented in modal pane)
     * @param {name, symbol, id}    coinInfo        Object containing selected currency's name, symbol,
     *                                              and currency ID number
     */
    function loadBuyOrSellModal(method, coinInfo) {
        // Reset fields
        quantityField.val("1");
        $(".validation-alert").hide();
        executeTransactionButton.addClass("disabled");
        totalPriceDisplay.text("");
        pricePerDisplay.text("");

        // Initialize modal pane
        $("#buysell-form").modal({
            dismissible: false,
            onOpenStart: function (modal, trigger) {
                if (method === "SELL") {
                    // Hide top available funds row
                    // Show debit parenthesis
                    availableFundsDisplay.hide();
                    $(".debit").show();
                } else {
                    availableFundsDisplay.show();
                    $(".debit").hide();
                }
                $("#modal-form-header").text(`${method} ${coinInfo.name} (${coinInfo.symbol})`);
                executeTransactionButton.text(method === "BUY" ? "PURCHASE" : "SELL");
                availableFundsDisplay.text(availableFunds.toFixed(2));
                updatePrice();
            }
        });
        
    }

    /** 
     * Update price in buy/sell modal form with new ajax request
     */ 
    function updatePrice() {
        // Disable purchase button until price updates
        executeTransactionButton.addClass("disabled");

        // Toggle loading message
        loadingAlertMsg.show();

        $.ajax({
            url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
            method: "GET",
        }).then(function (response) {
            var totalPrice = (quantityField.val() * response[0].price_usd).toFixed(2);
            pricePerDisplay.text(response[0].price_usd);
            totalPriceDisplay.text(totalPrice);

            // Check for sufficient funds
            if (totalPrice > availableFunds) {
                insufficientFundsAlert.show();
                executeTransactionButton.addClass("disabled");
            } else {
                insufficientFundsAlert.hide();
                executeTransactionButton.removeClass("disabled");
            }

            loadingAlertMsg.hide();
        });
        
    }

    /**
     * Adds selected currency to user's watch list
     * 
     * @param {name, symbol, id} selectedCoin   Object containing info about coin to watch
     */
    function addToWatchList(selectedCoin) {
        if (!watchList.find(c => c.symbol === selectedCoin.symbol)) {
            watchList.push(selectedCoin);
            localStorage.setItem("watchList", JSON.stringify(watchList));
            M.Toast.dismissAll();
            M.toast({
                html: `Added ${selectedCoin.name} (${selectedCoin.symbol}) to your watch list.`,
                displayLength: 2000
            });
        } else {
            M.Toast.dismissAll();
            M.toast({
                html: `${selectedCoin.name} (${selectedCoin.symbol}) is already on your watch list`,
                displayLength: 2000
            });
        }
    }

    /**
     * Hide the chart area and re-size primary tables
     */
    function resetChartArea() {
        // Hide chart area div
        $("#chart-div").attr("style", "display: none;");

        $("#coins-view").removeClass("s6");
        $("#coins-view").addClass("s12");
    }

    /**
     * Toggle validation alert on change if value in quantity field < 0
     */
    quantityField.change(function (event) {
        if (executeTransactionButton.text() === "SELL") {
            var ownedCurrency = ownedCurrencies.find(e => e.id === selectedCoin.id);
            if (ownedCurrency.ownedQuantity < quantityField.val()) {
                executeTransactionButton.addClass("disabled");
                return;
            } else {
                executeTransactionButton.removeClass("disabled");
            }
        }
        if (quantityField.val() <= 0) {
            quantityZeroAlert.show();
            totalPriceDisplay.text("0.00");
            executeTransactionButton.addClass("disabled");
        } else {
            quantityZeroAlert.hide();
            updatePrice();
        }
    });

    /**
     * Event listener for modal form purchase button
     */
    executeTransactionButton.click(function (event) {
        event.preventDefault();

        var qty = quantityField.val();
        var receipt = {
            qty: qty
        };

        if (executeTransactionButton.text() === "PURCHASE") {
            executeBuy(receipt);
        } else {
            executeSell(receipt);
        }
    });

    function executeBuy(receipt) {
        // Submit another API request to get most up-to-date price
        $.ajax({
            url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
            method: "GET"
        }).then(function (response) {
            if (totalPrice > availableFunds) {
                insufficientFundsAlert.show();
                return;
            }

            // Close form and show confirmation toast
            modalForm.modal('close');
            M.toast({
                html: `Purchased ${receipt.qty}x ${selectedCoin.name} (${selectedCoin.symbol})`,
                displayLength: 2000
            });
            var totalPrice = response[0].price_usd * receipt.qty;

            // Debit price from available funds
            localStorage.setItem("availableFunds", availableFunds - totalPrice);

            // Generate transaction receipt info and store in transaction history (local storage)
            receipt.pricePer = totalPrice / receipt.qty;
            receipt.total = totalPrice;
            receipt.date = moment()._d;

            if (!ownedCurrencies.find(e => e.id === selectedCoin.id)) {
                ownedCurrencies.push({
                    symbol: selectedCoin.symbol,
                    id: selectedCoin.id,
                    name: selectedCoin.name,
                    currentEquity: totalPrice,
                    ownedQuantity: parseFloat(receipt.qty),
                    purchaseTransactions: [receipt],
                    saleTransactions: []
                });
            } else {
                var ownedCurrency = ownedCurrencies.find(e => e.id === selectedCoin.id)
                ownedCurrency.purchaseTransactions.push(receipt);
                ownedCurrency.currentEquity += totalPrice;
                ownedCurrency.ownedQuantity += parseFloat(receipt.qty);
            }

            localStorage.setItem("ownedCurrencies", JSON.stringify(ownedCurrencies));

        });
    }

    function executeSell(receipt) {
        // Submit another API request to get most up-to-date price
        $.ajax({
            url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
            method: "GET"
        }).then(function (response) {
            // Close form and show confirmation toast
            modalForm.modal('close');
            M.toast({
                html: `Sold ${receipt.qty}x ${selectedCoin.name} (${selectedCoin.symbol})`,
                displayLength: 2500
            })
            var totalPrice = response[0].price_usd * receipt.qty;

            // Credit price to available funds
            localStorage.setItem("availableFunds", availableFunds + totalPrice);

            // Generate transaction receipt info and store in transaction history (local storage)
            receipt.pricePer = totalPrice / receipt.qty;
            receipt.total = totalPrice;
            receipt.date = moment()._d;

            var ownedCurrency = ownedCurrencies.find(e => e.id === selectedCoin.id);

            ownedCurrency.saleTransactions.push(receipt);
            ownedCurrency.currentEquity -= totalPrice;
            if (ownedCurrency.currentEquity < 0) {
                ownedCurrency.currentEquity = 0;
            }
            ownedCurrency.ownedQuantity -= parseFloat(receipt.qty);
            localStorage.setItem("ownedCurrencies", JSON.stringify(ownedCurrencies));
        });
    }

    /** 
     * Event listener for chart area close button
     */
    chartAreaCloseBtn.click(function(event) {
        // Hide chart area div
        $("#chart-div").attr("style", "display: none;");

        // Re-size table
        $("#coins-view").addClass("container");
        $("#coins-view").removeClass("s6");
        $("#coins-view").addClass("s12");

        // Remove highlight from selected row 
        ($("tbody").find(".active")).removeClass("active");
    });

    /** 
     * Event listener for modal form cancel button
     */
    $("#cancel-transaction-btn").click(function (event) {
        modalForm.modal('close');
    });

    /**
     * Event listener for modal form close button
     */
    $("#modal-form-close-btn").click(function (event) {
        modalForm.modal('close');
    });

});
