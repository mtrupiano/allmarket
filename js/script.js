
// Coin info
// Related news
// chart.JS

// user opens allmarket and wants to explore cryptocurrencies that fall within a price range. they buy one that has a high market cap
// user comes to allmarket to check for news and upon seeing a negative sentiment they want to "sell" their fake bitcoin
// user on their first visit to allmarket wants to add several currencies to their watch list.

$(document).ready(function() {

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

    });

    $.ajax({
        url: cryptoCompareURL,
        method: "GET"
    }).then(function(response) {
        console.log(response);
    });

    $("tbody").click(function(event) {
        $("#table-container").removeClass("container"); // This will remove wide right and left margins
        var colEl = $("#table-column");
        colEl.removeClass("s12");
        colEl.addClass("s6");
        
    });

});
