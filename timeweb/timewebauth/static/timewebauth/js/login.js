$(function() {

    // Reset storages from saveAndLoadStates from util.js
    sessionStorage.removeItem("open_assignments");
    sessionStorage.removeItem("scroll");
    localStorage.removeItem("last_visit");

    $(".socialaccount-container").click(function() {
        document.location.href = $(this).find("a").attr("href");
    });
});