/* 
This file includes the code for:

Starting animation
Keybinds
Setting assignment width on resize
Ajax error function
Other minor utilities
*/

// Use DOMContentLoaded because $(function() { fires too slowly on the initial animation for some reason
document.addEventListener("DOMContentLoaded", function() {
    csrf_token = $("form input:first-of-type").val();
    // Hide and show estimated completion time
    $("#hide-button").click(function() {
        if ($(this).html() === "Hide") {
            $(this).html("Show").prev().toggle();
            localStorage.setItem("hide-button", true);
        } else {
            $(this).html("Hide").prev().toggle();
            localStorage.removeItem("hide-button");
        }
    });
    if ("hide-button" in localStorage) {
        $("#hide-button").html("Show").prev().toggle();
    }
    // Do starting animation
    if (!("animation-ran" in sessionStorage)) {
        // If the animation has not already been run, add the class "animate" to the elements that will be animated
        // The animation will happen instantly, because the transitions are only applied to :not(.animate)
        // Then, when the window loads, remove ".animate". This will cause the actual transition
        $("main, header, #assignments-container").addClass("animate");
        // Animation has ran
        sessionStorage.setItem("animation-ran", true);
        // Use "$(window).on('load', function() {"" of "$(function) { "instead because "$(function() {" fires too early
        $(window).on('load', () => $("main, header, #assignments-container").removeClass("animate"));
    }
    // Keybinds
    $(document).keydown(function(e) {
        if (e.shiftKey /* Needed if the user presses caps lock */ && e.key === 'N') {
            $("#image-new-container").click();
        } else if (e.key === "Escape") {
            hideForm();
        }
    });
    // width * percent = width+10
    // percent = 1 + 10/width
    $(window).resize(function() {
        $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(document.querySelector(".assignment")).width()}`);
    });
    $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(document.querySelector(".assignment")).width()}`);
    // Ajax error function
    error = function(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
        } else if (response.status == 403) {
            alert(response.responseText);
        } else if (response.status == 404) {
            alert('Page not found, try again');
        } else if (response.status == 500) {
            alert('Internal server error. Please contact me if you see this');
        } else if (exception === 'parsererror') {
            alert('Requested JSON parse failed');
        } else if (exception === 'timeout') {
            alert('Timeout error');
        } else if (exception === 'abort') {
            alert('Request aborted');
        } else {
            document.write(response.responseText);
        }
    }
    // cite later
    // https://web.dev/customize-install/
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', function(e) {
        console.log(e);
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
    });
    $("#nav-items span").click(function() {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    alert("Thanks for installing the app. Please check your home page to see it. Note: offline access doesn't work and is still in development")
                }
            });
        } else {
            alert("Progressive web apps are not supported on your browswer.")
        }
    });
});
// Lock to landscape
// Does not work in Safari...
try {screen.orientation.lock('landscape');} catch {}
