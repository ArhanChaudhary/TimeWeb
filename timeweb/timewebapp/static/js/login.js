$(function() {
    // Style form if invalid
    if ($("#error-message").length) {
        $("#id_login, #id_password").css("box-shadow", "inset 0 0 3px 1px red");
    }
    // Reset storages from index.js
    sessionStorage.removeItem("open_assignments");
    localStorage.removeItem("scroll");

    $("#example-message").click(function() {
        $("#id_login").val("timeweb@example.com");
        $("#id_password").val("exampleaccount");
        $("#submit-button").click();
    });
    let clicked = false;
    $(".socialaccount-button").click(function() {
        if (clicked) return;
        clicked = true;
        $(this).find("a").click();
    });

    $(".password-image").click(function() {
        $(".password-image").toggle();
        $("#id_password").attr("type") === "text" ? $("#id_password").attr("type", "password") : $("#id_password").attr("type", "text");
    });
});