
// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
$(function() {
    function resize() {
        if (window.innerWidth < 410) {
            $("#logo-container").css({
                left: 5,
                transform: "none",
            });
        } else {
            $("#logo-container").css({
                left: '',
                transform: '',
            });
        }
        if (window.innerWidth < 320) {
            $("#logo-container").css("opacity", "0");
        } else {
            $("#logo-container").css("opacity", '');
        }
    }
    resize();
    $(window).resize(resize);
    // Reset storages
    sessionStorage.removeItem("open_assignments");
    localStorage.removeItem("scroll");
    $("#id_username").attr("placeholder", "Username");
    $("#id_password").attr("placeholder", "Password");
});