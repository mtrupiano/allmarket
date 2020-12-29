
// Coin info
// Related news
// chart.JS

// user opens allmarket and wants to explore cryptocurrencies that fall within a price range. they buy one that has a high market cap
// user comes to allmarket to check for news and upon seeing a negative sentiment they want to "sell" their fake bitcoin
// user on their first visit to allmarket wants to add several currencies to their watch list.

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
    var quantityField = $("#quantity");

    var coinLoreURL = "https://api.coinlore.net/api/tickers/";
    var key = "1D8CF151-75D6-407B-BD64-253F4241EFEE/";

    var cryptoCompareKey = "f4b9e28c75f0678a37042564fa90fd5214aa232b975d626b838a5f4a526ac605";

    var nomicsKey = "fa8abceb3eb222b8e323180022446677";
    var nomicsURL = "https://api.nomics.com/v1/currencies?key=" + nomicsKey + "&ids=BTC,ETH,XRP&attributes=id,name,logo_url";

    /**
     * Render full currency table when 'Coins' tab is clicked
     */
    $("a[href='#coins-view']").click(function(event) {
        $.ajax({
            url: coinLoreURL,
            method: "GET"
        }).then(function(response) {
            var tbodyEl = $("div#coins-view tbody");
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
                
                var newTableRow = $("<tr>");
                newTableRow.attr("data-crypto-id", element.id);
                newTableRow.append($("<td>").text(element.symbol));
                newTableRow.append($("<td>").text(element.name));
                newTableRow.append($("<td>").text(element.ownedQuantity.toFixed(2)));
                newTableRow.append($("<td>").text(element.currentEquity.toFixed(2)));
                ownedTbodyEl.append(newTableRow);
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
    $("#buy-sell-watch-group").click(function (event) {
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
        $("#purchase-sell-btn").addClass("disabled");

        // Initialize modal pane
        $("#buysell-form").modal({
            dismissible: false,
            onOpenStart: function (modal, trigger) {
                if (method === "SELL") {
                    // Hide top available funds row
                    // Show debit parenthesis
                    $("#available-funds-display").hide();
                    $(".debit").show();
                } else {
                    $("#available-funds-display").show();
                    $(".debit").hide();
                }
                $("#modal-form-header").text(`${method} ${coinInfo.name} (${coinInfo.symbol})`);
                $("#purchase-sell-btn").text(method === "BUY" ? "PURCHASE" : "SELL");
                $("#available-funds").text(availableFunds.toFixed(2));
                updatePrice();
            }
        });
        
    }

    /** 
     * Update price in buy/sell modal form with new ajax request
     */ 
    function updatePrice() {
        // Disable purchase button until price updates
        $("#purchase-btn").addClass("disabled");

        $.ajax({
            url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
            method: "GET",
            error: function() {
                M.toast({
                    html: "Error: failed to update price (timeout)"
                });
            },
            timeout: 2000
        }).then(function (response) {
            var totalPrice = (quantityField.val() * response[0].price_usd).toFixed(2);
            $("#price-value").text(response[0].price_usd);
            $("#total-price-display").text(totalPrice);

            // Check for sufficient funds
            if (totalPrice > availableFunds) {
                $("#alert-insuf-funds").show();
                $("#purchase-btn").addClass("disabled");
            } else {
                $("#alert-insuf-funds").hide();
            }

            $("#purchase-sell-btn").removeClass("disabled");
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

    function resetChartArea() {
        // Hide chart area div
        $("#chart-div").attr("style", "display: none;");

        $("#coins-view").removeClass("s6");
        $("#coins-view").addClass("s12");
    }

    // Toggle validation alert on change if value in quantity field < 0
    purchaseQuantityField.change(function (event) {
        if (purchaseQuantityField.val() <= 0) {
            $("#alert-qty-zero").show();
            $("#purchase-btn").addClass("disabled");
        } else {
            $("#alert-qty-zero").hide();
            updatePrice();
        }
    });

    // Event listener for modal form purchase button
    $("#purchase-sell-btn").click(function (event) {
        event.preventDefault();

        // Validate input in quantity field
        var qty = $("#purchase-quantity").val();

        // Submit another API request to get most up-to-date price
        $.ajax({
            url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
            method: "GET"
        }).then(function (response) {
            if (totalPrice > availableFunds) {
                $("#alert-insuf-funds").show();
                return;
            }

            // Close form and show confirmation toast
            $("#buysell-form").modal('close');
            M.toast({
                html: `Purchased ${qty}x ${selectedCoin.name} (${selectedCoin.symbol})`,
                displayLength: 2000
            })
            var totalPrice = response[0].price_usd * qty;

            // Debit price from available funds
            availableFunds = availableFunds - totalPrice;
            localStorage.setItem("availableFunds", availableFunds);

            // Generate transaction receipt info and store in transaction history (local storage)
            var receipt = {
                pricePer:   totalPrice/qty,
                total:      totalPrice,
                qty:        qty,
                date:       moment()._d
            };

            if (!ownedCurrencies.find(e => e.id === selectedCoin.id)) {
                ownedCurrencies.push({
                    symbol:             selectedCoin.symbol,
                    id:                 selectedCoin.id,
                    name:               selectedCoin.name,
                    currentEquity:      totalPrice,
                    ownedQuantity:      parseFloat(qty),
                    transactionsList:   [receipt]
                });
            } else {
                var idx = ownedCurrencies.findIndex(e => e.id === selectedCoin.id)
                ownedCurrencies[idx].transactionsList.push(receipt);
                ownedCurrencies[idx].currentEquity += totalPrice;
                ownedCurrencies[idx].ownedQuantity += parseFloat(qty);
            }

            localStorage.setItem("ownedCurrencies", JSON.stringify(ownedCurrencies));
            
        });
    });

    // Event listener for chart area close button
    $("#chart-close-btn").click(function(event) {
        // Hide chart area div
        $("#chart-div").attr("style", "display: none;");

        // Re-size table
        $("#coins-view").addClass("container");
        $("#coins-view").removeClass("s6");
        $("#coins-view").addClass("s12");

        // Remove highlight from selected row 
        ($("tbody").find(".active")).removeClass("active");
    });

    // Event listener for modal form cancel button
    $("#cancel-transaction-btn").click(function (event) {
        $("#buysell-form").modal('close');
    });

    // Event listener for modal form close button
    $(".modal-form-close-btn").click(function (event) {
        $("#buysell-form").modal('close');
    });

});
