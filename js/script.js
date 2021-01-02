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
    var chartAreaHeader   = $("#coin-chart-header");
    var watchBtn          = $("#watch-btn");
    
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

    // Chart.js set up
    Chart.defaults.global.defaultFontFamily = "Inconsolata";
    var chart;
    var ctx = $("#chart");

    $("a[href='#learn-view']").click(function (event) {
        resetChartArea($("#learn-view"));
    });

    /**
     * Render full currency table when 'Coins' tab is clicked
     */
    $("a[href='#coins-view']").click(function(event) {
        if ($("div#coins-view").hasClass("active")) {
            return;
        }

        resetChartArea($("#coins-view"));
        // Empty table
        var tbodyEl = $("div#coins-view tbody");
        tbodyEl.html(
            "<tr class='table-empty-msg'><td>Updating prices...</td></tr>");

        $.ajax({
            url: coinLoreURL,
            method: "GET"
        }).then(function(response) {
            tbodyEl.html("");
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
            tbodyEl.click(showChartArea);
        });
    });

    /**
     * Render owned and watching tables when 'My Wallet' tab is clicked
     */
    $("a[href='#wallet-view']").click(function (event) {
        if ($("div#wallet-view").hasClass("active")) {
            return;
        }
        resetChartArea($("#wallet-view"));
        
        renderOwnedTable();
        renderWatchTable();
    });

    /** 
     * Render the chart area
     */
    function showChartArea(event) {
        event.preventDefault();

        // Get selected table row from event
        var target = $(event.target);
        if (target.prop("tagName").toLowerCase() !== "td") {
            return;
        }
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
        chartAreaHeader.children("h3").text(name + " (" + symbol + ")");

        // Shrink table to the left of the page
        var viewEl = selectedRow.parent().parent().parent().parent();
        viewEl.parent().removeClass("container");
        viewEl.parent().attr("style", "margin-left: 30px; margin-right: 30px;")
        viewEl.removeClass("s12");
        viewEl.addClass("l6");

        // Submit API request to get most up-to-date price
        var price = 0;
        $.ajax({
            url: `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`,
            method: "GET"
        }).then(function (response) {
            price = response.USD;
            $("#chart-area-price-display").text(price.toFixed(2));

            // Submit API request to CryptoCompare for history of selected coin's value
            var cryptoCompareURL =
                `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareKey}&extraParams="School-project"`;
            $.ajax({
                url: cryptoCompareURL,
                method: "GET"
            }).then(function (response) {
                // Extract date and price data from response and render the chart
                console.log(response);
                var dataArr = response.Data.Data;
                var data = [];
                for (var i = 0; i < dataArr.length; i++) {
                    var dateStr = (moment.unix(dataArr[i].time)).format("YYYY-MM-DD");
                    data.push({
                        x: dataArr[i].time,
                        y: dataArr[i].close
                    });
                }
                data.push({
                    x: moment().unix(),
                    y: price
                });
                renderChart(data);
            });
        });

        if (watchList.find(e => e.id === selectedCoin.id)) {
            watchBtn.text("UNWATCH");
        } else {
            watchBtn.text("WATCH");
        }

        // Un-hide the chart area div
        $("#chart-div").show();

        // Disable 'Sell' button if user does not own any of this currency
        if (!ownedCurrencies.find(e => e.id === selectedCoin.id) ||
            (ownedCurrencies.find(e => e.id === selectedCoin.id)).ownedQuantity === 0) {
            $(".sell-btn").addClass("disabled");
        } else {
            $(".sell-btn").removeClass("disabled");
        }

        /** 
         * Event listener for chart area close button
         */
        chartAreaCloseBtn.click(function (event) {
            // Hide chart area div
            $("#chart-div").hide();

            // Re-size table
            viewEl.parent().addClass("container");
            viewEl.parent().attr("style", "");
            viewEl.removeClass("l6");
            viewEl.addClass("s12");

            // Remove highlight from selected row 
            selectedRow.removeClass("active");
            chartAreaCloseBtn.off();
        });
    }

    /**
     * Renders the price chart
     * 
     * @param  data     Array of points to plot
     */
    function renderChart(data) {
        console.log(data);
        

        var chartOptions = {
            responsive: true,
            hover: {
                mode: "nearest",
                intersect: true
            }, 
            scales: {
                xAxes: [{
                    display: true,
                    type: "linear",
                    scaleLabel: {
                        display: true,
                        labelString: "Date",
                        fontSize: 20
                    },
                    ticks: {
                        min: data[0].x,
                        max: data[data.length-1].x
                    }
                }],
                yAxes: [{
                    display: true,
                    type: "linear",
                    scaleLabel: {
                        display: true,
                        labelString: "USD ($)",
                        fontSize: 20
                    }
                }]
            },
            legend: {
                display: false
            }
        }
        var dataset = {
            borderColor: 'rgb(148, 58, 173,1)',
            fill: false,
            data: data
        }
        var chartCfg = {
            type: "line",
            data: {
                datasets: [dataset]
            },
            options: chartOptions
        }

        if (chart) {
            chart.destroy();
        } 
        chart = new Chart(ctx, chartCfg);

    }

    /**
     * Take appropriate action when button in 'buy-sell-watch-group' is clicked
     */
    chartAreaBtnGroup.click(function (event) {
        event.preventDefault();

        var target = $(event.target);
        if (target.text() === "BUY" || target.text() === "SELL") {
            loadBuyOrSellModal(target.text(), selectedCoin);
        } else if (target.text() === "UNWATCH" || target.text() === "WATCH") {
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
            },
            onCloseEnd: renderOwnedTable
        });
        
    }

    /**
     * Draw table showing "Owned" currencies
     */
    function renderOwnedTable() {
        var ownedTbodyEl = $("#owned tbody");
        var activeRow = ownedTbodyEl.find(".active");
        ownedTbodyEl.text("");

        // Generate a string with all symbols of owned currencies to put on API request URL
        var symList = "";
        for (var i = 0; i < ownedCurrencies.length; i++) {
            if (ownedCurrencies[i].ownedQuantity > 0) {
                if (i !== 0) {
                    symList += ","
                }
                symList += ownedCurrencies[i].symbol;
            }
        }

        // Indirect way of detecting if user owns any currencies
        if (symList === "") {
            // Show message in table area saying "You don't own any currencies"
            ownedTbodyEl.html(
                "<tr class='table-empty-msg'><td>You don't currently own any currencies.</td></tr>");
            return;
        }

        ownedTbodyEl.html(
            "<tr class='table-empty-msg'><td>Updating prices...</td></tr>");

        var url = 
            `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symList}` +
            `&tsyms=USD&extraParams="School-project"`;

        // Submit an API request to get the most recent price for all owned currencies and draw
        // table rows with these prices
        $.ajax({
            url: url,
            method: "GET"
        }).then(function (response) {

            ownedTbodyEl.html("")
;
            for (var i = 0; i < ownedCurrencies.length; i++) {
                var element = ownedCurrencies[i];
                if (element.ownedQuantity !== 0) {
                    var newTableRow = $("<tr>");
                    newTableRow.attr("data-crypto-id", element.id);
                    newTableRow.append($("<td>").text(element.symbol));
                    newTableRow.append($("<td>").text(element.name));
                    newTableRow.append($("<td>").text(element.ownedQuantity.toFixed(2)));
                    newTableRow.append($("<td>").text(response[element.symbol].USD.toFixed(2)));
                    // Calculate net gain/loss on a currency
                    var net = (response[element.symbol].USD * element.ownedQuantity) - element.spent;
                    var netEntry = $("<td>").text(net.toFixed(2));
                    if (net < 0) {
                        netEntry.removeClass("gain");
                        netEntry.addClass("loss");
                    } else {
                        netEntry.removeClass("loss");
                        netEntry.addClass("gain");
                    }

                    newTableRow.append(netEntry);

                    // Apply "active" highlight if row was previously selected
                    if (activeRow.length !== 0 && element.id === activeRow.attr("data-crypto-id")) {
                        newTableRow.addClass("active");
                    }
                    
                    ownedTbodyEl.append(newTableRow);
                }
            }
        });


        ownedTbodyEl.click(function (event) {
            var target = $(event.target);

            if (target.prop("tagName").toLowerCase() === "td") {
                showChartArea(event);
            }
        });
    }

    function renderWatchTable() {
        var watchingTbodyEl = $("#watching tbody");
        watchingTbodyEl.text(""); // Clear watching table

        if (watchList.length === 0) {
            // Show message in table body saying "You're not currently watching any currencies."
            watchingTbodyEl.html(
                "<tr class='table-empty-msg'><td>You're not currently watching any currencies.</td></tr>");
            return;
        }

        // Show message saying "updating watch list"
        watchingTbodyEl.html(
            "<tr class='table-empty-msg'><td>Updating prices...</td></tr>");

        var symList = "";
        for (var i = 0; i < watchList.length; i++) {
            symList += watchList[i].symbol;
            if (i !== watchList.length-1) {
                symList += ","
            }
        }

        var url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symList}&tsyms=USD`;

        // Submit an API request to get the most recent price for all watched currencies and draw
        // table rows with these prices
        $.ajax({
            url: url,
            method: "GET"
        }).then(function(response) {
            watchingTbodyEl.html("");
            for (var i = 0; i < watchList.length; i++) {
                var newTableRow = $("<tr>");
                var symbol = watchList[i].symbol;
                newTableRow.attr("data-crypto-id", watchList[i].id);
                newTableRow.append($("<td>").text(symbol));
                newTableRow.append($("<td>").text(watchList[i].name));
                newTableRow.append($("<td>").text(response[symbol].USD));
                watchingTbodyEl.append(newTableRow);
            }
        });

        watchingTbodyEl.click(function (event) {
            var target = $(event.target);
            if (target.prop("tagName").toLowerCase() === "td") {
                showChartArea(event);
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
        if (!watchList.find(c => c.id === selectedCoin.id)) {
            watchList.push(selectedCoin);
            localStorage.setItem("watchList", JSON.stringify(watchList));
            M.Toast.dismissAll();
            M.toast({
                html: `Added ${selectedCoin.name} (${selectedCoin.symbol}) to your watch list.`,
                displayLength: 2000
            });
            watchBtn.text("UNWATCH");
        } else {
            // Remove coin from watch list
            watchList.splice(watchList.findIndex(e => e.id === selectedCoin.id), 1);
            localStorage.setItem("watchList", JSON.stringify(watchList));
            M.Toast.dismissAll();
            M.toast({
                html: `${selectedCoin.name} (${selectedCoin.symbol}) removed from watch list.`,
                displayLength: 2000
            });
            watchBtn.text("WATCH");
        }

        renderWatchTable();
    }

    /**
     * Hide the chart area and re-size primary tables
     */
    function resetChartArea(viewContainer) {
        // Hide chart area div
        $("#chart-div").hide();

        viewContainer.removeClass("l6");
        viewContainer.addClass("s12");
        viewContainer.parent().attr("style", "");
        viewContainer.parent().addClass("container");
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
            
            // Debit price from available funds
            var totalPrice = response[0].price_usd * receipt.qty;
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
                    spent: totalPrice,
                    ownedQuantity: parseFloat(receipt.qty),
                    purchaseTransactions: [receipt],
                    saleTransactions: []
                });
            } else {
                var ownedCurrency = ownedCurrencies.find(e => e.id === selectedCoin.id)
                ownedCurrency.purchaseTransactions.push(receipt);
                ownedCurrency.spent += totalPrice;
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
            ownedCurrency.spent -= totalPrice;
            if (ownedCurrency.spent < 0) {
                ownedCurrency.spent = 0;
            }
            ownedCurrency.ownedQuantity -= parseFloat(receipt.qty);
            localStorage.setItem("ownedCurrencies", JSON.stringify(ownedCurrencies));
        });
    }

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