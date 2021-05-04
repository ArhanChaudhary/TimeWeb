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
// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
$(function() {
    // Style form if invalid
    if ($("#error-message").length) {
        $("#id_username, #id_password").css("box-shadow", "inset 0 0 3px 1px red");
    }
    // Reset storages from index.js
    sessionStorage.removeItem("open_assignments");
    sessionStorage.removeItem("first_login");
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
});