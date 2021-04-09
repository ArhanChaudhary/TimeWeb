/*
This file includes the code for:

Prioritizing and coloring assignments,
Animating assignments that were just created or modified

*/
document.addEventListener("DOMContentLoaded", function() {
    // Returns color rgb from priority percentage
    function color(p) {
        return `rgb(${132+94*p},${200-109*p},${65+15*p})`;
    }
    const k = [1,0.95,0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.5,0.45,0.4,0.35,0.3,0.25,0.2,0.15,0.1,0.05,0,0,0];
    swap = function(a1, a2) {
        // Queues each swap
        $(document).queue(function() {
            const all = $(".assignment-container"),
                tar1 = all.eq(a1),
                tar2 = all.eq(a2),
                tar1_height = tar1.height() + 10,
                tar2_height = tar2.height() + 10;

            // Deal with existing assingment margin
            // Don't really know how this works but it makes the swap transition more smooth
            if (tar1_height > tar2_height) {
                tar2.css("margin-top", 10);
            } else {
                tar1.css("margin-bottom", 10);
            }
            const swap_duration = 2000;
            tar1.animate({
                top: tar2.offset().top + tar2_height - tar1.offset().top - tar1_height,
                marginBottom: "-=" + (tar1_height - tar2_height),
            }, {
                queue: false,
                duration: swap_duration,
                easing: "easeInOutQuad",
            });

            tar2.animate({
                bottom: tar2.offset().top - tar1.offset().top,
                marginTop: "+=" + (tar1_height - tar2_height),
            }, {
                queue: false,
                duration: swap_duration,
                easing: "easeInOutQuad",
                complete: function() {
                    const swap_temp = $("<span></span>").insertAfter(tar2);
                    tar1.after(tar2);
                    swap_temp.after(tar1);
                    tar1.removeAttr("style");
                    tar2.removeAttr("style");
                    swap_temp.remove();
                    $(document).dequeue();
                },
            });
        });
    }
    // 
    // Handles animating assignments that were just created or modified and coloring
    //

    // A bit of context: the backend puts "#animate-in" to an assignment that was just created and "#animate-color" to an assignment that was just modified
    // It's only one or the other

    // If an assignment was just modified, I want it to be scrolled to and then change color from white to its priority color

    // If an assignment was just created, I want it to be scrolled to and then fade and ease in from the bottom, also animating making room for it in the list
    // This is done by setting its bottom margin to the negative value of its height, effectively making it seem like it's not there
    // Then, the assignment is moved to the bottom of the page and hidden by using the "top" and "opacity" styles
    // Finally, they are all set to their default values in a jQuery animation in the function directly below this
    function color_or_animate_assignment($assignment, index, is_element_submitted=false) {
        if ($("#animate-in").length && is_element_submitted) {
            // If a new assignment was created and the assignment that color_or_animate_assignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"
            $assignment.parent().animate({
                top: "0", 
                opacity: "1", 
                marginBottom: "0",
            }, 1500, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (color_priority) {
            $assignment.css("background", color(k[index]));
        }
        if (text_priority) {
            $assignment.find(".title").attr("data-priority",`Priority: ${k[index]*100}%`);
        }
    }
    // The rest of the code auto scrolls to the assignment and then runs color_or_animate_assignment() on it only when it finishes scrolling
    $(".assignment").each(function(index) {
        const assignment_container = $(this).parent();
        if (assignment_container.is("#animate-color, #animate-in")) {
            // If the iterated assignment is the one that was created or modified, run this
            if ($("#animate-in").length) {
                // Set initial transition values for "#animate-in"
                assignment_container.css({
                    // 20+ and -10 deals with top and bottom margins
                    "top": 20+$("#assignments-container").offset().top + $("#assignments-container").height() - assignment_container.offset().top,
                    "opacity": "0",
                    "margin-bottom": -assignment_container.height()-10,
                });
            }
            new Promise(function(resolve) {
                $(window).on('load', function() {
                    // Since "#animate-in" will have a bottom margin of negative its height, the next assignment will be in its final position at the start of the animation
                    // So, scroll to the next assignment instead
                    let assignment_to_scroll_to = $("#animate-in").next();
                    if (!assignment_to_scroll_to.length) {
                        // If "#animate-color" or "#animate-in" is the last assignment on the list, scroll to itself instead
                        assignment_to_scroll_to = assignment_container;
                    }
                    setTimeout(function() {
                        // scrollIntoView sometimes doesn't work without setTimeour
                        assignment_to_scroll_to[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                        });
                    }, 0);
                    // The scroll function determines when the page has stopped scrolling and internally resolves the promise via "resolver"
                    resolver = resolve;
                    $("main").scroll(scroll);
                    scroll();
                });
            }).then(() => color_or_animate_assignment($(this), index, true)); // Arrow function to preserve "this"
        } else {
            // If the assignment iterated isn't the one that was created or modified, color it instantly
            color_or_animate_assignment($(this), index);
        }
    });
});
// Make these global because other files use scroll()
let scrollTimeout, resolver;
function scroll() {
    clearTimeout(scrollTimeout);
    // Runs when scroll ends
    scrollTimeout = setTimeout(function() {
        $("main").off('scroll');
        // Resolves promise from the scope it is called in
        resolver();
    }, 200);
}