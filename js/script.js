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
    
    // Tab view elements
    var learnView                   = $("#learn-view");
    var currentView                 = learnView;
    var walletView                  = $("#wallet-view");
    var coinsView                   = $("#coins-view");
    var coinAndWalletViewContainer  = $("#coin-and-wallet-view-container");

    // Funds display elements
    var fundsDisplayRow             = $("#funds-display-row");
    var availableFundsMainDisplay   = $("#available-funds-main-display");
    var equityMainDisplay           = $("#total-equity-display");

    // Elements of chart area
    var chartDiv          = $("#chart-div");
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
    var invalidQtyAlert =           $("#alert-invalid-qty");
    var transactionSubmitAlert =    $("#transaction-submit-alert");

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
        if (currentView === learnView) { return; }
        currentView = learnView;
        fundsDisplayRow.hide();
        resetChartArea(learnView);
    });

    /**
     * Render full currency table when 'Coins' tab is clicked
     */
    $("a[href='#coins-view']").click(function(event) {
        if (currentView === coinsView) { return; }

        currentView = coinsView;
        fundsDisplayRow.show();
        resetChartArea(coinsView);
        // Empty table
        var tbodyEl = $("div#coins-view tbody");
        tbodyEl.html(
            "<tr class='table-empty-msg'><td>Updating prices...</td></tr>");
        renderAvailableFundsDisplay();

        $.ajax({
            url: coinLoreURL,
            method: "GET"
        }).then(function(response) {
            tbodyEl.html("");
            var responseArr = response.data;
            for (var i = 0; i < response.data.length; i++) {
                var element = responseArr[i];
                var newTableRow = $("<tr>").attr("data-crypto-id", element.id);
                newTableRow.append($("<td>").text(element.symbol), $("<td>").text(element.name),
                    $("<td>").text(element.price_usd));
                var pChange = $("<td>").text(element.percent_change_24h);
                if (element.percent_change_24h >= 0) {
                    pChange.addClass("gain");
                } else {
                    pChange.addClass("loss");
                }
                newTableRow.append(pChange);
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
        if (currentView === walletView) { return; }

        currentView = walletView;
        fundsDisplayRow.show();
        resetChartArea(walletView);
        
        renderAvailableFundsDisplay();
        renderOwnedTable();
        renderWatchTable();
    });

    // Populate funds display with available funds and equity
    function renderAvailableFundsDisplay() {
        // Re-load available funds from local storage
        if (localStorage.getItem("availableFunds")) {
            var availableFunds = JSON.parse(localStorage.getItem("availableFunds"));
        } else {
            var availableFunds = 2000;
            localStorage.setItem("availableFunds", availableFunds);
        }
        availableFundsMainDisplay.text("Funds available for trading: $" + availableFunds.toFixed(2) + " (USD)");

        var symList = "";
        for (var i = 0; i < ownedCurrencies.length; i++) {
            if (ownedCurrencies[i].ownedQuantity > 0) {
                if (i !== 0) {
                    symList += ","
                }
                symList += ownedCurrencies[i].symbol;
            }
        }

        if (symList === "") {
            equityMainDisplay.text("Total equity: $0.00 (USD)");
            return;
        }

        var url =
            `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symList}` +
            `&tsyms=USD&extraParams="School-project"`;
        
        $.ajax({
            url: url,
            method: "GET"
        }).then(function(response) {
            var totalEquity = 0;
            for (var i = 0; i < ownedCurrencies.length; i++) {
                var element = ownedCurrencies[i];
                if (element.ownedQuantity !== 0) {
                    totalEquity += response[element.symbol].USD * element.ownedQuantity;
                }
            }

            equityMainDisplay.text("Total equity: $" + totalEquity.toFixed(2) + " (USD)");
        });
    }

    /** 
     * Render the chart area
     */
    function showChartArea(event) {
        event.preventDefault();
        $("#news-row").html("");
        coinAndWalletViewContainer.show();

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
        chartAreaHeader.children("h3").text(`${name} (${symbol})`);

        // Shrink table to the left of the page
        var viewEl = selectedRow.parent().parent().parent().parent();
        coinAndWalletViewContainer.removeClass("container");
        viewEl.removeClass("s12");
        viewEl.addClass("m6");
        viewEl.attr("style", "max-width: 750px;");

        // Submit API request to get most up-to-date price
        var price = 0;
        $.ajax({
            url: `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`,
            method: "GET"
        }).then(function (response) {
            price = response.USD;
            $("#chart-area-price-display").text(price);

            // Submit API request to CryptoCompare for history of selected coin's value
            var cryptoCompareURL =
                `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}`+
                `&tsym=USD&api_key=${cryptoCompareKey}&extraParams="School-project"`;
            $.ajax({
                url: cryptoCompareURL,
                method: "GET"
            }).then(function (response) {
                // Extract date and price data from response and render the chart
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

        // Pull top news articles related to selected coin
        var newsRow = $("#news-row");
        var ccNewsURL = `https://min-api.cryptocompare.com/data/v2/news/?categories=${symbol}` + 
            `regulation&extraParams=School-project`

        $("#news-row-header").text(symbol + " News");
        $.ajax({
            url: ccNewsURL,
            method: "GET"
        }).then(function(response) {
            for (var i = 0; i < (response.Data.length > 20 ? 20 : response.Data.length); i++) {
                var newsLink = $("<a>");
                newsLink.attr("href", response.Data[i].url);
                newsLink.attr("target", "_blank");
                var newDiv = $("<div>");
                newDiv.addClass("row news-entry valign-wrapper");

                var newsImg = $("<img>").attr("src", response.Data[i].imageurl);
                newsImg.attr("width", "50");
                newsImg.attr("height", "50");
                var imgCol = $("<div>").addClass("col s2 valign-wrapper");
                imgCol.append(newsImg);

                var pCol = $("<div>").addClass("col s10");

                pCol.append($("<p>").text(response.Data[i].title + 
                    " (" + response.Data[i].source_info.name + ")"));
                newDiv.append(imgCol, pCol);
                newsLink.append(newDiv);
                newsRow.append(newsLink);
            }
        });

        // Toggle watch list button saying "WATCH" or "UNWATCH"
        if (watchList.find(e => e.id === selectedCoin.id)) {
            watchBtn.text("UNWATCH");
        } else {
            watchBtn.text("WATCH");
        }

        // Un-hide the chart area div
        chartDiv.show();

        // Hide the tables if on mobile
        if ($(window).width() <= 974) {
            if (currentView === walletView) { walletView.hide(); }
            else if (currentView === coinsView) { coinsView.hide(); }
        } else {
            if (currentView === walletView) { walletView.show(); }
            else if (currentView === coinsView) { coinsView.show(); }
        }

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
            chartDiv.hide();

            // Show whichever view is hidden
            if (currentView === walletView) { walletView.show(); }
            else if (currentView === coinsView) { coinsView.show(); }

            // Re-size table
            coinAndWalletViewContainer.addClass("container");
            viewEl.attr("style", "max-width: none;");
            viewEl.removeClass("m6");
            viewEl.addClass("s12");

            // Remove highlight from selected row 
            selectedRow.removeClass("active");

            chartAreaCloseBtn.off();
        });
    }

    /**
     * Renders the price history chart
     * 
     * @param  data     Array of points to plot
     */
    function renderChart(data) {
        // Chart options
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
                        max: data[data.length-1].x,
                        minRotation: 30
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

        // Data set options
        var dataset = {
            borderColor: 'rgb(148, 58, 173,1)',
            fill: false,
            data: data
        }

        // Chart config object
        var chartCfg = {
            type: "line",
            data: {
                datasets: [dataset]
            },
            options: chartOptions
        }

        // Destroy chart before making new one
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
        modalForm.modal({
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
                $("#available-funds").text(availableFunds.toFixed(2));
                updatePrice();
            },
            onCloseEnd: function() {
                renderOwnedTable();
            }
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

            ownedTbodyEl.html("");
            for (var i = 0; i < ownedCurrencies.length; i++) {
                var element = ownedCurrencies[i];
                if (element.ownedQuantity !== 0) {
                    var newTableRow = $("<tr>");
                    newTableRow.attr("data-crypto-id", element.id);
                    newTableRow.append($("<td>").text(element.symbol), $("<td>").text(element.name),
                        $("<td>").text(element.ownedQuantity.toFixed(2)), 
                        $("<td>").text((response[element.symbol].USD * element.ownedQuantity).toFixed(2)));

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

        // Submit an API request to get the most recent price for all watched currencies and draw
        // table rows with these prices
        $.ajax({
            url: `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symList}&tsyms=USD`,
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
            url: (`https://min-api.cryptocompare.com/data/price?fsym=${selectedCoin.symbol}` +
                `&tsyms=USD&extraParams=School-project`),
            method: "GET",
        }).then(function (response) {
            var totalPrice = (quantityField.val() * response.USD).toFixed(2);
            pricePerDisplay.text(response.USD);
            totalPriceDisplay.text(totalPrice);

            // Check for sufficient funds
            if (totalPrice > availableFunds && executeTransactionButton.text() === "PURCHASE") {
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
        chartDiv.hide();
        $("#news-row").html("");

        viewContainer.removeClass("m6");
        viewContainer.addClass("s12");
        viewContainer.attr("style", "max-width: none;");
        coinAndWalletViewContainer.addClass("container");
    }

    /**
     * Toggle validation alert on change if value in quantity field < 0
     */
    quantityField.change(function (event) {
        if (executeTransactionButton.text() === "SELL") {
            var ownedCurrency = ownedCurrencies.find(e => e.id === selectedCoin.id);
            if (ownedCurrency.ownedQuantity < quantityField.val()) {
                executeTransactionButton.addClass("disabled");
                invalidQtyAlert.show()
                return;
            } else {
                invalidQtyAlert.hide()
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
        executeTransactionButton.addClass("disabled");
        transactionSubmitAlert.show();
        // Submit another API request to get most up-to-date price
        $.ajax({
            url: (`https://min-api.cryptocompare.com/data/price?fsym=${selectedCoin.symbol}` + 
                 `&tsyms=USD&extraParams=School-project`),
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
            var totalPrice = response.USD * receipt.qty;
            availableFunds -= totalPrice;
            localStorage.setItem("availableFunds", availableFunds);

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
            renderAvailableFundsDisplay();
            executeTransactionButton.removeClass("disabled");
            transactionSubmitAlert.hide();
        });
    }

    function executeSell(receipt) {
        executeTransactionButton.addClass("disabled");
        transactionSubmitAlert.show();

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
            availableFunds += totalPrice;
            localStorage.setItem("availableFunds", availableFunds);

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

            executeTransactionButton.removeClass("disabled");
            transactionSubmitAlert.hide();
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

    // Hide the tables if the chart view is open and the screen is re-sized below 992 pixels
    $(window).resize(function() {
        if ($(window).width() <= 974 && chartDiv.css("display") !== "none") {
            if (currentView === walletView) { walletView.hide(); }
            else if (currentView === coinsView) { coinsView.hide(); }
        } else {
            if (currentView === walletView) { walletView.show(); }
            else if (currentView === coinsView) { coinsView.show(); }
        }
    });

});