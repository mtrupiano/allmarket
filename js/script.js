
// Coin info
// Related news



$(document).ready(function() {

    var coinLoreURL = "https://api.coinlore.net/api/tickers/";
    var key = "1D8CF151-75D6-407B-BD64-253F4241EFEE";
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
        // console.log(response);
    });

});
