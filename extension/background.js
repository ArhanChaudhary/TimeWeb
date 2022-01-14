chrome.action.onClicked.addListener(function(tab){
    chrome.tabs.create({
        'url': "https://timeweb.io",
        active: true,
    });
});