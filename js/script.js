
// Coin info
// Related news
// chart.JS

// user opens allmarket and wants to explore cryptocurrencies that fall within a price range. they buy one that has a high market cap
// user comes to allmarket to check for news and upon seeing a negative sentiment they want to "sell" their fake bitcoin
// user on their first visit to allmarket wants to add several currencies to their watch list.

$(document).ready(function() {

    if (localStorage.getItem("watchList")) {
        var watchList = JSON.parse(localStorage.getItem("watchList"));
    } else {
        var watchList = [];
        localStorage.setItem("watchList", JSON.stringify(watchList));
    }

    var coinLoreURL = "https://api.coinlore.net/api/tickers/";
    var key = "1D8CF151-75D6-407B-BD64-253F4241EFEE";

    var cryptoCompareKey = "f4b9e28c75f0678a37042564fa90fd5214aa232b975d626b838a5f4a526ac605";
    var cryptoCompareURL = "https://min-api.cryptocompare.com/data/v2/histoday?fsym=ETH&tsym=USD&api_key=" + cryptoCompareKey;
    
    var nomicsKey = "fa8abceb3eb222b8e323180022446677";
    var nomicsURL = "https://api.nomics.com/v1/currencies?key=" + nomicsKey + "&ids=BTC,ETH,XRP&attributes=id,name,logo_url";
    // var coinAPIURL = "https://rest-sandbox.coinapi.io/v1/quotes/HBDM_FTS_BTC_USD_191227/history?apikey=" + key + "&time_start=1607558400";

    $.ajax({
        url: coinLoreURL,
        method: "GET"
    }).then(function(response) {
        var responseArr = response.data;
        for (var i = 0; i < response.data.length; i++) {
            var symbol = responseArr[i].symbol;
            var name = responseArr[i].name;
            var price = responseArr[i].price_usd;

            var newTableRow = $("<tr>");
            newTableRow.append($("<td>").text(symbol));
            newTableRow.append($("<td>").text(name));
            newTableRow.append($("<td>").text(price));
            $("tbody").append(newTableRow);
        }

        // Event listener for selecting a cryptocurrency from the presented table
        $("tbody").click(function (event) {
            // Remove any previously assigned event listener to buy/sell/watch buttons
            $("#buy-sell-watch-group").off(); 
            
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

            // Add coin symbol and name as headers in chart area
            $("#coin-chart-header").children("h3").text(symbol);
            $("#coin-chart-header").children("h4").text(name);

            // Shrink table to the left of the page
            $("#table-container").removeClass("container");
            var colEl = $("#table-column");
            colEl.removeClass("s12");
            colEl.addClass("s6");

            // Un-hide the chart area div
            $("#chart-div").attr("style", "");

            // Add event listener to buy/sell/watch buttons
            $("#buy-sell-watch-group").click(function (event) {
                event.preventDefault();
                var target = $(event.target);
                if (target.text() !== "WATCH") {
                    loadBuyOrSellModal(target.text(), { coinName: name, coinSymbol: symbol });
                } else {
                    addToWatchList({ coinName: name, coinSymbol: symbol });
                }
            });

        });

    });

    /** 
     * Load modal pane content for buying or selling a currency
     * 
     * @param                           method        BUY or SELL (dictates content presented in modal pane)
     * @param {coinName, coinSymbol}    coinInfo      Object containing selected currency's name and symbol
     */
    function loadBuyOrSellModal(method, coinInfo) {
        var purchaseQuantityField = $("#purchase-quantity");
        purchaseQuantityField.val("1");
        // Initialize modal pane and attach listeners
        $("#buysell-form").modal({
            dismissible: false,
            onOpenStart: function (modal, trigger) {
                $("#modal-form-header").text(`${method} ${coinInfo.coinName} (${coinInfo.coinSymbol})`);
            },
            onOpenEnd: function (modal, trigger) {
                console.log(modal, trigger);
                $(".modal-form-close-btn").click(function (event) {
                    $("#buysell-form").modal('close');
                });
            }
        });

        $("#purchase-btn").click(function(event) {
            var qty = $("#purchase-quantity").val();
            if (qty < 1) {
                $("#validation-alert").text("Must be greater than 0.");
                return;
            }
        });

        // Toggle validation alert on change if value in quantity field < 0
        purchaseQuantityField.change(function(event) {
            if (purchaseQuantityField.val() < 1) {
                $("#validation-alert").show();
            } else {
                $("#validation-alert").hide();
            }
        });

        // Event listener for cancel button
        $("#cancel-purchase-btn").click(function(event) {
            $("#buysell-form").modal('close');
        });
    }

    /**
     * 
     * 
     * @param {coinName, coinSymbol} coinInfo 
     */
    function addToWatchList(coinInfo) {
        if (!watchList.find(c => c.coinSymbol === coinInfo.coinSymbol)) {
            watchList.push(coinInfo);
            localStorage.setItem("watchList", JSON.stringify(watchList));
            M.Toast.dismissAll();
            M.toast({
                html: `Added ${coinInfo.coinName} (${coinInfo.coinSymbol}) to your watch list.`,
                displayLength: 2000
            });
        } else {
            M.Toast.dismissAll();
            M.toast({ 
                html: `${coinInfo.coinName} (${coinInfo.coinSymbol}) is already on your watch list`,
                displayLength: 2000
            });
        }
    }

    $.ajax({
        url: cryptoCompareURL,
        method: "GET"
    }).then(function(response) {
        console.log(response);
    });

    // Event listener for chart area close button
    $("#chart-close-btn").click(function(event) {
        // Hide chart area div
        $("#chart-div").attr("style", "display: none;");

        // Re-size table
        $("#table-container").addClass("container");
        var colEl = $("#table-column");
        colEl.removeClass("s6");
        colEl.addClass("s12");

        // Remove highlight from selected row 
        ($("tbody").find(".active")).removeClass("active");
    });

});
