fetch("https://api.sandbox.competitions.recall.network/api/price?token=So11111111111111111111111111111111111111112&chain=svm&specificChain=eth", {
    headers: {
      "Authorization": "Bearer 57f3236691e652e4_5dd73dc0ea97b21e"
    }
  }).then(res => res.json()).then(data => {
    console.log(data);
  });   