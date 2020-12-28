
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

    var selectedCoin;
    var purchaseQuantityField = $("#purchase-quantity");

    var coinLoreURL = "https://api.coinlore.net/api/tickers/";
    var key = "1D8CF151-75D6-407B-BD64-253F4241EFEE/";

    var cryptoCompareKey = "f4b9e28c75f0678a37042564fa90fd5214aa232b975d626b838a5f4a526ac605";

    var nomicsKey = "fa8abceb3eb222b8e323180022446677";
    var nomicsURL = "https://api.nomics.com/v1/currencies?key=" + nomicsKey + "&ids=BTC,ETH,XRP&attributes=id,name,logo_url";

    $.ajax({
        url: coinLoreURL,
        method: "GET"
    }).then(function(response) {
        var responseArr = response.data;
        for (var i = 0; i < response.data.length; i++) {
            var symbol = responseArr[i].symbol;
            var name = responseArr[i].name;
            var price = responseArr[i].price_usd;
            var id = responseArr[i].id;

            var newTableRow = $("<tr>");
            newTableRow.attr("data-crypto-id", id);
            newTableRow.append($("<td>").text(symbol));
            newTableRow.append($("<td>").text(name));
            newTableRow.append($("<td>").text(price));
            $("tbody").append(newTableRow);
        }

        // Event listener for selecting a cryptocurrency from the presented table
        $("tbody").click(function (event) {
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
            $("#coins-view").removeClass("container");
            var colEl = $("#table-column");
            colEl.removeClass("s12");
            colEl.addClass("s6");

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

        });

    });

    // Event listener for buy/sell/watch buttons
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
        purchaseQuantityField.val("1");
        $("#validation-alert").hide();
        $("#purchase-btn").addClass("disabled");

        // Initialize modal pane
        $("#buysell-form").modal({
            dismissible: false,
            onOpenStart: function (modal, trigger) {
                $("#modal-form-header").text(`${method} ${coinInfo.name} (${coinInfo.symbol})`);
                $("#qty-display").text(purchaseQuantityField.val());

                $.ajax({
                    url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
                    method: "GET"
                }).then(function (response) {
                    $("#price-value").text(response[0].price_usd);
                    $("#purchase-btn").removeClass("disabled");
                    $("#total-price-display").text((purchaseQuantityField.val() * response[0].price_usd).toFixed(2));
                });
            }
        });
        
    }

    // Toggle validation alert on change if value in quantity field < 0
    purchaseQuantityField.change(function(event) {
        if (purchaseQuantityField.val() <= 0) {
            $("#validation-alert").show();
            $("#purchase-btn").addClass("disabled");
        } else {
            $("#validation-alert").hide();
            $("#qty-display").text(purchaseQuantityField.val());
            $.ajax({
                url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
                method: "GET"
            }).then(function (response) {
                $("#price-value").text(response[0].price_usd);
                $("#purchase-btn").removeClass("disabled");
                $("#total-price-display").text((purchaseQuantityField.val() * response[0].price_usd).toFixed(2));
            });
        }
    });

    // Event listener for modal form purchase button
    $("#purchase-btn").click(function (event) {
        event.preventDefault();

        // Validate input in quantity field
        var qty = $("#purchase-quantity").val();

        // Submit another API request to get most up-to-date price
        $.ajax({
            url: "https://api.coinlore.net/api/ticker/?id=" + selectedCoin.id,
            method: "GET"
        }).then(function (response) {
            var price = response[0].price_usd * qty;

            // Check and update available funds
            if (price > availableFunds) {
                // Transaction fails, insufficient funds
                return;
            }
            availableFunds = availableFunds - price;
            localStorage.setItem("availableFunds", availableFunds);

            // Generate transaction receipt info and store in transaction history (local storage)
            var receipt = {
                pricePer:   price/qty,
                total:      price,
                qty:        qty,
                date:       moment()._d
            };

            if (localStorage.getItem("transactions")) {
                var transactions = JSON.parse(localStorage.getItem("transactions"));
            } else {
                var transactions = [];
            }

            if (!transactions.find(e => e.id === selectedCoin.id)) {
                transactions.push({
                    symbol:             selectedCoin.symbol,
                    id:                 selectedCoin.id,
                    name:               selectedCoin.name,
                    currentEquity:      price,
                    transactionsList:   [receipt]
                });
            } else {
                var idx = transactions.findIndex(e => e.id === selectedCoin.id)
                transactions[idx].transactionsList.push(receipt);
                transactions[idx].currentEquity += price;
            }

            localStorage.setItem("transactions", JSON.stringify(transactions));
        });
    });

    /**
     * 
     * 
     * @param {name, symbol, id} coinInfo   Object containing info about coin to watch
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

    // Event listener for chart area close button
    $("#chart-close-btn").click(function(event) {
        // Hide chart area div
        $("#chart-div").attr("style", "display: none;");

        // Re-size table
        $("#coins-view").addClass("container");
        var colEl = $("#table-column");
        colEl.removeClass("s6");
        colEl.addClass("s12");

        // Remove highlight from selected row 
        ($("tbody").find(".active")).removeClass("active");
    });

    // Event listener for modal form cancel button
    $("#cancel-purchase-btn").click(function (event) {
        $("#buysell-form").modal('close');
    });

    // Event listener for modal form close button
    $(".modal-form-close-btn").click(function (event) {
        $("#buysell-form").modal('close');
    });

});
