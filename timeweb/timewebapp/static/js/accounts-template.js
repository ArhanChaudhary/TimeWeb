$(function() {
    // Position login
    $("main").css({
        overflowY: "hidden",

        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    });
    $("#form-wrapper form").submit(function() {
        $("#submit-button").attr("disabled", true);
    });
});