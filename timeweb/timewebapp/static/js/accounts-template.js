$(function() {
    // Position login
    $("main").css({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    })[0].style.setProperty("overflow", "hidden", "important");
    $("#form-wrapper form").submit(function() {
        $("#submit-button").attr("disabled", true);
    });
});