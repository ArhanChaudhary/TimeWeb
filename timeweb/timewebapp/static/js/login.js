/* 
This file includes the code for:

Preventing form resubmits on refresh
Styling form fields
Ensuring the animation only occurs once

This only runs on login.html
*/
if (!window.gtag) {
    function gtag() {};
}
gtag("event","logged_out");
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
    $("form").submit(function() {
        sessionStorage.setItem("login-animation-ran", true);
    });
    if ("login-animation-ran" in sessionStorage) {
        $(window).one("load", function() {
            $("#login").css({
                "animation": "none",
                "transform": "none",
                "opacity": "1",
            });
            $("#image").css({
                "animation": "slide 200s linear infinite",
                "opacity": "0.75",
            });
        });
    }
    // Position login
    $("main").css({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    });
    $("#example-message").click(function() {
        $("#id_username").val("Example");
        $("#id_password").val("exampleaccount");
        $("#submit-button").click();
    });
    $("#form-wrapper form").submit(function() {
        $("#submit-button").attr("disabled", true);
    });
});