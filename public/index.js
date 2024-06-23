function checkValue(sender) {
    let i = parseInt(sender.value);
    if (i < sender.min) {
        sender.value = sender.min;
    } else if (i > sender.max) {
        sender.value = sender.max;
    }
}