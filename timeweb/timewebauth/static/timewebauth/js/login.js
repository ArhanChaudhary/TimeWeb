$(function() {
    $(".socialaccount-container").click(function() {
        document.location.href = $(this).find("a").attr("href");
    });
});