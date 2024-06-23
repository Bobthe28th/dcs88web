window.onload = function () {
    let purchaseButtons = document.getElementsByClassName("purchase");
    for (let i = 0; i < purchaseButtons.length; i++) {
        purchaseButtons[i].addEventListener('click', async function() {
            try {
                let response = await (await fetch("http://localhost:28/buy", {
                    method: 'post',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        item: purchaseButtons[i].getAttribute("itemid"),
                        count: purchaseButtons[i].parentElement.querySelector(".quantity").value
                    })
                })).json();
                console.log(response);
                if (response.success) {
                    alert(`Purchased ${response.count}x ${response.name}`);
                    location.reload();
                } else {
                    alert((response.notfound ? "Item not found in store! Report to Bobthe28th" : "") + (response.stock ? "Not enough items in stock!" : "") + ((response.stock && response.toohigh) ? "\n" : "") + (response.toohigh ? "Not enough money!" : ""));
                }
            } catch (error) {
                console.error(`Error: ${error}`);
            }
        }, false);
    }
}