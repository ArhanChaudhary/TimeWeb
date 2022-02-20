$(function() {
    $("#form-wrapper form").submit(function() {
        $("#submit-button").attr("disabled", true);
    });
});