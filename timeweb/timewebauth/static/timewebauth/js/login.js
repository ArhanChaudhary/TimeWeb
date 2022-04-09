$(function() {

    // Reset storages from index.js
    sessionStorage.removeItem("open_assignments");
    localStorage.removeItem("scroll");

    $(".socialaccount-container").click(function() {
        document.location.href = $(this).find("a").attr("href");
    });

    $(".password-image").click(function() {
        $(".password-image").toggle();
        $("#id_password").attr("type") === "text" ? $("#id_password").attr("type", "password") : $("#id_password").attr("type", "text");
    });
});