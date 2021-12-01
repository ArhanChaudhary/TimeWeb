$(function() {
    // Style form if invalid
    if ($("#error-message").length) {
        $("#id_username, #id_password").css("box-shadow", "inset 0 0 3px 1px red");
        $("#example-message").css("margin-top", -153);
    }
    // Reset storages from index.js
    sessionStorage.removeItem("open_assignments");
    localStorage.removeItem("scroll");
    $("#id_username").attr("placeholder", "Username");
    $("#id_password").attr("placeholder", "Password");

    $("#example-message").click(function() {
        $("#id_username").val("Example");
        $("#id_password").val("exampleaccount");
        $("#submit-button").click();
    });

    $(".socialaccount-button").click(function() {
        $(this).find("a").click();
    });
});