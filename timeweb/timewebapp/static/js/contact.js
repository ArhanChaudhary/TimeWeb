$(window).one("load", function() {
    $("#id_body").expandableTextareaHeight().trigger("input");
})
function submitContactForm(token) {
    document.getElementById("contact-form").submit();
}