$(function() {

    // Reset storages from index.js
    sessionStorage.removeItem("open_assignments");
    localStorage.removeItem("scroll");

    $("#example-message").click(function() {
        $("#id_login").val("timeweb@example.com");
        $("#id_password").val("exampleaccount");
        $("#submit-button").click();
    });

    $(".socialaccount-container").click(function() {
        document.location.href = $(this).find("a").attr("href");
    });

    $(".password-image").click(function() {
        $(".password-image").toggle();
        $("#id_password").attr("type") === "text" ? $("#id_password").attr("type", "password") : $("#id_password").attr("type", "text");
    });
});