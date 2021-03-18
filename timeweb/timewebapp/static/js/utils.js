/* 
This file includes the code for:

Keybinds
Setting assignment width on resize
Ajax error function
Other minor utilities
*/
$(function() {
    // Keybinds
    $(document).keydown(function(e) {
        if (e.shiftKey /* Needed if the user presses caps lock */ && e.key === 'N') {
            $("#image-new-container").click();
        } else if (e.key === "Escape") {
            hideForm();
        }
    });
    // Set assignment width on resize to calc(100vw - 60px) for hover transition, cannot use vw or % because they aren't performant for some reason
    let widthTimeout;
    $(window).resize(function() {
        $(".assignment").css("width",window.innerWidth-60).addClass("disable-assignment-transition");
        clearTimeout(widthTimeout);
        widthTimeout = setTimeout(function() {
            $(".assignment").removeClass("disable-assignment-transition");
        }, 200);
    });
    $(".assignment").css("width",window.innerWidth-60);
    // Ajax error function
    error = function(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
        } else if (response.status == 404) {
            alert('Requested page not found, try again');
        } else if (response.status == 500) {
            alert('Internal server error. Please contact me if you see this')
        } else if (exception === 'parsererror') {
            alert('Requested JSON parse failed');
        } else if (exception === 'timeout') {
            alert('Timeout error');
        } else if (exception === 'abort') {
            alert('Request aborted');
        } else {
            alert('Uncaught Error, \n' + response.responseText);
        }
    }
    // Hide and show estimated completion time
    $("#hide-button").click(function() {
        $(this).html($(this).html() === 'Hide' ? 'Show' : 'Hide').prev().toggle();
    });
});