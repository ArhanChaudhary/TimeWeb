// Edited assignment transitions for easing in and color are handled in priority.js because that part of the code was more fitting to put there
const FORM_ANIMATION_DURATION = 300;
const DEFAULT_FORM_FIELDS = {
    "#id_name": '',
    "#id_assignment_date": utils.formatting.stringifyDate(date_now),
    "#id_x": '',
    "#id_unit": def_unit_to_minute ? "Minute" : '',
    "#id_y": '',
    "#id_works": '0',
    "#id_time_per_unit": '',
    "#id_description": '',
    "#id_funct_round": '',
    "#id_min_work_time": +def_min_work_time||'',
}
function showForm(show_instantly=false) {
    if (show_instantly) {
        $('#overlay').show().children("#form-wrapper").css("top", 15);
    } else {
        $("#overlay").fadeIn(FORM_ANIMATION_DURATION).children("#form-wrapper").animate({top: 15}, FORM_ANIMATION_DURATION);
        if (!isMobile) {
            form_inputs.first().focus();
        } else {
            $(document.activeElement).blur();
        }
    }
    $("main").css("overflow-y", "hidden");
    old_unit_value = undefined;
    replaceUnit();
}
function hideForm(hide_instantly=false) {
    if (hide_instantly) {
        $("#overlay").hide().children("#form-wrapper");
        $(".error-note, .invalid").remove(); // Remove all error notes when form is exited
    } else {
        $("#overlay").fadeOut(FORM_ANIMATION_DURATION, function() {
            // Remove all error notes when form is exited
            $(".invalid").removeClass("invalid");
            $(".error-note").remove();
        }).children("#form-wrapper").animate({top: 0}, FORM_ANIMATION_DURATION);
    }
    $("main").css("overflow-y", "overlay");
}
let old_unit_value;
function replaceUnit() {
    const val = $("#id_unit").val().trim();
    const plural = pluralize(val),
        singular = pluralize(val,1),
        singularToLowerCase = singular.toLowerCase();
    const units_of_time = {"minute": 1, "hour": 60};
    if (val) {
        if (singularToLowerCase in units_of_time) {
            $("label[for='id_y']").text(`Estimate how many ${plural[0].toUpperCase() + plural.substring(1).toLowerCase()} this assignment will Take to Complete`);
        } else {
            $("label[for='id_y']").text(`Total number of ${plural} in this Assignment`);
        }
        $("label[for='id_works']").onlyText(`Total number of ${plural} already Completed`);
        $("label[for='id_time_per_unit']").text(`Estimated number of Minutes to complete each ${singular}`);
        $("label[for='id_funct_round']").onlyText(`Number of ${plural} you will Complete at a Time`);
        $("label[for='id_funct_round'] .info-button-text").text(`e.g: if you enter 3, you will only work in multiples of 3 (6 ${plural}, 9 ${plural}, 15 ${plural}, etc)`)
    } else {
        $("label[for='id_y']").html("Total number of Units in this Assignment");
        $("label[for='id_works']").onlyText("Total number of Units already Completed");
        $("label[for='id_time_per_unit']").html("Estimated number of Minutes to complete each Unit");
        $("label[for='id_funct_round']").onlyText("Number of Units you will Complete at a Time");
        $("label[for='id_funct_round'] .info-button-text").text("e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)")
    }
    if (singularToLowerCase in units_of_time) {
        $("#id_time_per_unit").val(units_of_time[singularToLowerCase]);
        $("#id_time_per_unit").prop("disabled",true).addClass("disabled-field");
        $("label[for='id_time_per_unit']").addClass("disabled-field");
        if (def_funct_round_minute && singularToLowerCase === "minute") {
            $("#id_funct_round").val(5);
            $("#id_funct_round").prop("disabled",true).addClass("disabled-field");
            $("label[for='id_funct_round']").addClass("disabled-field");
        }
    } else {
        old_unit_value in units_of_time && $("#id_time_per_unit").val("");
        $("#id_time_per_unit").prop("disabled",false).removeClass("disabled-field");
        $("label[for='id_time_per_unit']").removeClass("disabled-field");   
    }
    if (def_funct_round_minute && singularToLowerCase !== "minute") {
        old_unit_value in units_of_time && $("#id_funct_round").val("");
        $("#id_funct_round").prop("disabled",false).removeClass("disabled-field");
        $("label[for='id_funct_round']").removeClass("disabled-field");
    }
    old_unit_value = singularToLowerCase;
    $("#fields-wrapper").css("height", $("#advanced-inputs").position().top + $("#fields-wrapper").scrollTop());
}
$(window).one("load", function() {
    // Create and show a new form when user clicks new assignment
    $("#image-new-container").click(function() {
        for (const field in DEFAULT_FORM_FIELDS) {
            $(field).val(DEFAULT_FORM_FIELDS[field]);
        }
        for (let break_day of Array(7).keys()) {
            // (break_days+6)%7) is for ordering I think
            // Treat this as: $("#id_break_days_"+break_days).prop("checked", def_break_days.includes(break_days));
            $("#id_break_days_"+((break_day+6)%7)).prop("checked", def_break_days.includes(break_day));
        }
        // Set form text
        $("#new-title").html("New Assignment");
        $("#submit-assignment-button").html("Create Assignment").val('');
        // Show form
        showForm();
    });
    // Populate form on edit
    $('.update-button').parent().click(function() {
        // Set form text
        $("#new-title").html("Edit Assignment");
        $("#submit-assignment-button").html("Edit Assignment");
        // Find which assignment in dat was clicked
        const sa = utils.loadAssignmentData($(this));
        const x = new Date(sa.assignment_date.valueOf());
        x.setDate(x.getDate() + sa.x);
        const form_data = [
            sa.name,
            utils.formatting.stringifyDate(sa.assignment_date),
            sa.x ? utils.formatting.stringifyDate(x) : '',
            sa.unit,
            sa.needs_more_info ? '' : sa.y,
            sa.works[0],
            sa.needs_more_info ? '' : sa.time_per_unit,
            sa.description,
            sa.original_funct_round-1 ? +sa.original_funct_round : '', // Displays nothing if it is 1
            (sa.original_min_work_time*sa.time_per_unit)||'',
        ];
        form_inputs.each((index, element) => $(element).val(form_data[index]));
        setTimeout(function() {
            $("#id_description").trigger("input");
        }, 0);
        for (let break_day of Array(7).keys()) {
            // (break_day+6)%7) is for an ordering issue, ignore that
            // Treat this as: $("#id_break_days_"+break_day).prop("checked", def_breawk_days.includes(break_day));
            $("#id_break_days_"+((break_day+6)%7)).prop("checked", sa.break_days.includes(break_day));
        }
        $("#id_unit, #id_y, #id_works, #id_time_per_unit").toggleClass("invalid", sa.needs_more_info);
        $("#id_x").toggleClass("invalid", !sa.x);
        // Set button pk so it gets sent on post
        $("#submit-assignment-button").val(sa.id);
        showForm();
    });
    $("#form-wrapper #cancel-button").click(() => hideForm());
    $("#id_unit").on('input', replaceUnit);
    $("#id_description").on("input", function() {
        $(this).css("height", "auto"); // Needed for expanding with text
        $(this).css("height", $(this).prop("scrollHeight") + +$(this).css("padding-top").replace("px", "") + +$(this).css("padding-bottom").replace("px", ""));
    });
    // Add info buttons ($.info defined in template.js)
    $("#id_unit").info('left',
        `This is how your assignment will be split and divided up
        
        e.g: If this assignment is reading a book, enter "Page" or "Chapter"

        If you're unsure how to split up your assignment, divide it up into units of time instead by entering "Minute" or "Hour"`, 
    "after").css({
        marginBottom: -14,
        float: 'right',
        left: -15,
        bottom: 18,
    });
    $("#id_works").info('left',
        `The following is only relevant if you're re-entering this field

        This value is also the y-coordinate of the first point on the blue line, and changing this initial value will vertically translate all of your other work inputs accordingly`,
    "after").css({
        marginBottom: -14,
        float: 'right',
        left: -15,
        bottom: 18,
    });
    $("#id_funct_round").info('left',
        "e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)",
    "after").css({
        marginBottom: -14,
        float: 'right',
        left: -15,
        bottom: 18,
    });
    // All form inputs, can't use "#form-wrapper input:visible" because form is initially hidden
    // Make this global so it can be used in saveAndLoadStates in utils.js
    form_inputs = $("#form-wrapper input:not([type='hidden']):not([name='break_days']), #form-wrapper textarea");
    // Sets custom error message
    form_inputs.on("input invalid",function(e) {
        let message;
        if (e.type === "invalid") {
            switch ($(this).attr("id")) {
                case "id_name":
                    message = 'Please enter an assignment name';
                    break;
                case "id_ad":
                    message = 'The assignment date is either out of range or invalid';
                    break;
                case "id_x":
                    message = 'The due date is either out of range or invalid';
                    break;
                case "id_unit":
                    message = 'Please enter a name';
                    break;
                case "id_y":
                case "id_works":
                case "id_time_per_unit":
                case "id_funct_round":
                    message = 'Please enter a value';
                    break;
                case "id_min_work_time":
                    message = 'Please enter a minimum work time';
                    break;
            }
        } else {
            message = '';
        }
        this.setCustomValidity(message);
    });
    // Form submission
    let submitted = false;
    $("#form-wrapper form").submit(function(e) {
        // Prevent submit button spam clicking
        if (submitted) {
            e.preventDefault();
            return;
        }
        submitted = true;
        // Enable disabled field on submit so it's sent with post
        $("#id_time_per_unit, #id_funct_round").removeAttr("disabled");
        // JSON fields are picky with their number inputs, convert them to standard form
        $("#id_works").val(+$("#id_works").val());
        $("#submit-assignment-button").text("Submitting...");
        gtag("event","modify_assignment");
    });
    // Style errors if form is invalid
    $("#form-wrapper .error-note").each(function() {
        $(this).siblings("input, textarea").addClass("invalid");
        // Give the previous field an error if appropriate
        if (this.id === "error_id_x" && $(this).text().includes("assignment date") || this.id === "error_id_works" && $(this).text().includes("of")) {
            // Style invalid form for previous cousin
            $(this).parents(".field-wrapper").prev().children("input, textarea").first().addClass("invalid");
        }
    });
    // Delete assignment
    transitionDeleteAssignment = function(dom_assignment) {
        const sa = utils.loadAssignmentData(dom_assignment);

        // Make overflow hidden because trying transitioning margin bottom off the screen still allows it to be scrolled to
        // $("#assignments-container").css("overflow", "hidden");
        // NOTE: removed because of bugginess and just looking bad overall

        // Opacity CSS transition
        dom_assignment.css("opacity", "0");
        const assignment_container = dom_assignment.parents(".assignment-container");
        // Animate height on assignment_container because it doesn't have a transition
        const boxHeightMinusShortcuts = dom_assignment.outerHeight() + +assignment_container.css("padding-top").replace("px", "") + +assignment_container.css("padding-bottom").replace("px", "");
        assignment_container.animate({marginBottom: -boxHeightMinusShortcuts}, 750, "easeOutCubic", function() {
            // $("#assignments-container").css("overflow", "");
            // Remove assignment data from dat
            dat = dat.filter(_sa => sa.id !== _sa.id);
            // If a shorcut is in assignment_container, take it out so it doesn't get deleted
            assignment_container.children("#delete-starred-assignments, #autofill-work-done").insertBefore(assignment_container);
            // Remove assignment from DOM
            assignment_container.remove();
            // Although nothing needs to be swapped, priority.sort() still needs to be run
            // This is to recolor and prioritize assignments and place "delete all starred assignments" accordingly
            priority.sort();
        });
        gtag("event","delete_assignment");
    }
    transitionDeleteAssignments = function($assignment_container, assignment_ids_to_delete) {
        $assignment_container.each(function(i) {
            gtag("event","delete_assignment");
            const assignment_container = $(this);
            const dom_assignment = assignment_container.children(".assignment");
            // Opacity CSS transition
            dom_assignment.css("opacity", "0");
            // Use the height of dom_assignment instead of assignment_container to ignore the height of shortcuts
            const boxHeightMinusShortcuts = dom_assignment.outerHeight() + +assignment_container.css("padding-top").replace("px", "") + +assignment_container.css("padding-bottom").replace("px", "");
            assignment_container.animate({marginBottom: -boxHeightMinusShortcuts}, 750, "easeOutCubic", function() {
                // If a shortcut is in assignment_container, take it out so it doesn't get deleted
                assignment_container.children("#delete-starred-assignments, #autofill-work-done").insertBefore(assignment_container);
                // Remove assignment from DOM
                assignment_container.remove();
                // Run on last callback
                if (i === $assignment_container.length - 1) {
                    // Remove from dat
                    dat = dat.filter(_sa => !assignment_ids_to_delete.includes(_sa.id));
                    // Although nothing needs to be swapped, priority.sort() still needs to be run
                    // This is to recolor and prioritize assignments and place "delete all starred assignments" accordingly
                    priority.sort();
                }
            });
        }); 
    }
    function deleteAssignment($button) {
        // Unfocus to prevent pressing enter to click again
        $button.blur();
        const dom_assignment = $button.parents(".assignment");
        // Deny updating or deleting again after queued
        dom_assignment.css("pointer-events", "none");
        // Send data to backend and animates its deletion
        const success = function() {
            transitionDeleteAssignment(dom_assignment);
        }
        if (ajaxUtils.disable_ajax) {
            success();
            return;
        }
        const sa = utils.loadAssignmentData(dom_assignment);
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'delete_assignment',
            'assignments': [sa.id], // Primary key value
        }
        $.ajax({
            type: "POST",
            data: data,
            success: success,
            error: function() {
                // If ajax failed, allow updating or deleting again and dequeue
                dom_assignment.css("pointer-events", "auto");
                ajaxUtils.error(...arguments);
            }
        });
    }
    $('.delete-button').parent().click(function(e) {
        const $this = $(this);
        if (e.shiftKey) {
            deleteAssignment($this);
            return;
        }
        $.confirm({
            title: 'Are you sure you want to delete this assignment?',
            content: 'This action is irreversible',
            buttons: {
                confirm: {
                    keys: ['Enter'],
                    action: function() {
                        deleteAssignment($this);
                    }
                },
                cancel: function() {
                    
                }
            }
        });
    });
    if ($(".error-note").length) {
        showForm(true); // Show instantly
    } else {
        hideForm(true); // Hide instantly
    }
    invalidOnlyInAdvanced = function() {
        return !!$("#form-wrapper .error-note").first().parents(".field-wrapper").prevAll().filter(function() {
            return $(this).is("#form-wrapper #advanced-inputs");
        }).length;
    }
    if (invalidOnlyInAdvanced()) {
        $("#form-wrapper #advanced-inputs").click();
    }
});
// Only change text of form label
$.fn.onlyText = function(text) {
    $(this).contents().filter(function() {
        return this.nodeType === Node.TEXT_NODE;
    }).first()[0].nodeValue = text;
    return $(this);
};