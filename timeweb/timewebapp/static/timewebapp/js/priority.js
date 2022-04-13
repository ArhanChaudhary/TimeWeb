// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Priority {
    static ANIMATE_IN_DURATION = 1500 * SETTINGS.animation_speed;
    static SWAP_TRANSITION_DELAY_FUNCTION = transform_value => (1.75 + Math.abs(transform_value) / 2000) * SETTINGS.animation_speed;
    static SORT_TIMEOUT_DURATION = 35;
    static DARK_MODE_ALPHA = 0.6;
    static ANIMATE_IN_START_MARGIN = 100; // Moves #animate-in a bit below the last assignment to give it more breathing room
    static TOO_MUCH_TO_AUTOFILL_CUTOFF = 7500;
    
    static INCOMPLETE_WORKS = 10;
    static NO_WORKING_DAYS = 9;
    static NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT = 8;
    static NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG = 7;
    static NEEDS_MORE_INFO_AND_GC_ASSIGNMENT = 6;
    static UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW = 5;
    static UNFINISHED_FOR_TODAY = 4;
    static FINISHED_FOR_TODAY = 3;
    static NOT_YET_ASSIGNED = 2;
    static COMPLETELY_FINISHED = 1;

    constructor() {
        const that = this;
        that.due_date_passed_notices = [];
        that.due_date_incremented_notices = [];
        that.priority_data_list = [];
        that.total_completion_time = 0;
        that.today_and_tomorrow_total_completion_time = 0;
    }
    
    percentageToColor(priority_percentage) {
        const that = this;
        const percentage_as_decimal = priority_percentage / 100;
        const low_hsv = utils.formatting.rgbToHSV(SETTINGS.lowest_priority_color.r, SETTINGS.lowest_priority_color.g, SETTINGS.lowest_priority_color.b);
        const high_hsv = utils.formatting.rgbToHSV(SETTINGS.highest_priority_color.r, SETTINGS.highest_priority_color.g, SETTINGS.highest_priority_color.b);
        const h = low_hsv.h + (high_hsv.h - low_hsv.h) * percentage_as_decimal;
        const s = low_hsv.s + (high_hsv.s - low_hsv.s) * percentage_as_decimal;
        const v = low_hsv.v + (high_hsv.v - low_hsv.v) * percentage_as_decimal;
        return utils.formatting.hsvToRGB(h, s, v);
    }
    // Handles coloring and animating assignments that were just created or edited
    colorOrAnimateInAssignment(params) {
        const that = this;
        if ($("#animate-in").length && params.is_element_submitted) {
            // If a new assignment was created and the assignment that colorOrAnimateInAssignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"

            // Don't make this a CSS animation because margin-bottom is used a lot on .assignment-container and it's easier if it doesn't have a css transition
            params.dom_assignment.parents(".assignment-container").animate({
                top: "0",
                opacity: "1",
                marginBottom: "0",
            }, Priority.ANIMATE_IN_DURATION, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (SETTINGS.show_priority) {
            setTimeout(() => {
                if (params.first_sort) {
                    params.dom_assignment.addClass("transition-instantly");
                }
                if (isNaN(params.priority_percentage)) {
                    params.dom_assignment.prop("style").setProperty("--priority-color", "rgba(0, 0, 0, 0)");
                } else {
                    const priority_color = that.percentageToColor(params.priority_percentage);
                    params.dom_assignment.prop("style").setProperty("--priority-color", `rgb(${priority_color.r}, ${priority_color.g}, ${priority_color.b})`);
                }
                params.dom_assignment.toggleClass("mark-as-done", params.mark_as_done);
                if (params.first_sort) {
                    params.dom_assignment[0].offsetHeight;
                    params.dom_assignment.removeClass("transition-instantly");
                }
            }, 0);
        }
    }
    setInitialAssignmentTopOffset($assignment_container) {
        const that = this;
        $assignment_container.attr("data-initial-top-offset", $assignment_container.offset().top);
    }

    domSortAssignments(priority_data_list) {
        const that = this;
        // Selection sort
        for (let [index, sa] of priority_data_list.entries()) {
            // index represents the selected assignment's final position
            // sa.index represents the selected assignment's current position
            if (index !== sa.index) {
                // Swap them in the dom
                that.domSwapAssignments(index, sa.index);
                // Swap them in priority_data_list
                priority_data_list.find(sa => sa.index === index).index = sa.index; // Adjust index of assignment that used to be there 
                sa.index = index; // Adjust index of current swapped assignment
            }
        }
    }

    domSwapAssignments(tar1_index, tar2_index) {  
        const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
        const swap_temp = $("<span></span>").insertAfter(tar2);
        tar1.after(tar2);
        swap_temp.after(tar1);
        swap_temp.remove();
    }

    transitionSwap(assignment_container) {
        const initial_height = assignment_container.attr("data-initial-top-offset");
        const current_translate_value = (assignment_container.css("transform").split(",")[5]||")").slice(0,-1); // Read the translateY value from the returned matrix
        // If an assignment is doing a transition and this is called again, subtract its transform value to find its final top offset
        const final_height = assignment_container.offset().top - Math.sign(current_translate_value) * Math.floor(Math.abs(current_translate_value)); // the "Math" stuff floors or ceils the value closer to zero
        const transform_value = initial_height - final_height;
        assignment_container.removeAttr("data-initial-top-offset");
        assignment_container.addClass("transform-instantly")
                .css("transform", `translateY(${transform_value}px)`)
                [0].offsetHeight;
        assignment_container.removeClass("transform-instantly")
                .css({
                    transform: "",
                    transitionDuration: `${Priority.SWAP_TRANSITION_DELAY_FUNCTION(transform_value)}s`, // Delays longer transforms
                });
    }        

    updateAssignmentHeaderMessagesAndSetPriorityData() {
        const that = this;
        let complete_date_now = utils.getRawDateNow();
        $(".assignment").each(function(index) {
            const dom_assignment = $(this);
            const sa = new Assignment(dom_assignment);

            // Remember: protect ajaxs with !sa.sa.needs_more_info

            const skew_ratio_bound = sa.calcSkewRatioBound();
            if (sa.sa.skew_ratio > skew_ratio_bound) {
                sa.sa.skew_ratio = skew_ratio_bound;
                !sa.sa.needs_more_info && ajaxUtils.sendAttributeAjaxWithTimeout("skew_ratio", sa.sa.skew_ratio, sa.sa.id);
            } else if (sa.sa.skew_ratio < 2 - skew_ratio_bound) {
                sa.sa.skew_ratio = 2 - skew_ratio_bound;
                !sa.sa.needs_more_info && ajaxUtils.sendAttributeAjaxWithTimeout("skew_ratio", sa.sa.skew_ratio, sa.sa.id);
            }

            sa.setParabolaValues();
            if (that.params.first_sort)
                // Fix dynamic start if y or anything else was changed
                // setParabolaValues needs to be above for it doesn't run in this function with fixed mode

                // Don't sa.autotuneSkewRatio() because we don't want to change the skew ratio when the user hasn't submitted any work inputs
                sa.setDynamicStartIfInDynamicMode();
            
            let display_format_minutes = false;
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
            let todo = sa.funct(len_works + sa.sa.blue_line_start + 1) - last_work_input;
            const assignment_container = $(".assignment-container").eq(index),
                dom_status_image = $(".status-image").eq(index),
                dom_status_message = $(".status-message").eq(index),
                dom_title = $(".title").eq(index),
                dom_completion_time = $(".completion-time").eq(index),
                dom_tags = $(".tags").eq(index);

            let first_real_tag = sa.sa.tags[0];
            for (let tag_index_iterator = 1; ["Important","Not Important"].includes(first_real_tag); tag_index_iterator++) {
                first_real_tag = sa.sa.tags[tag_index_iterator];
            }
            
            if (sa.sa.tags.includes("Important")) {
                var has_important_tag = true;
            } else if (sa.sa.tags.includes("Not Important")) {
                var has_not_important_tag = true;
            }

            let complete_due_date = new Date(sa.sa.assignment_date.valueOf());
            complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.sa.complete_x));
            if (sa.sa.due_time && (sa.sa.due_time.hour || sa.sa.due_time.minute)) {
                complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.sa.due_time.hour * 60 + sa.sa.due_time.minute);
            }
            // (complete_due_date <= complete_date_now && !sa.sa.soft)
            // This marks the assignment as completed if its due date passes
            // However, if the due date is soft, the system doesnt know whether or not the user finished the assignment or needs to extend its due date
            // So, dont star it because the user may misinterpret that as having completed the assignment when in reality the user may need an extension
            // Instead, give it a question mark so it can be appropriately handled
            
            // This evaluates to false if complete_due_date or complete_date_now are invalid dates
            const due_date_passed = complete_due_date <= complete_date_now;

            let number_of_forgotten_days = today_minus_assignment_date - (sa.sa.blue_line_start + len_works); // Make this a variable so len_works++ doesn't affect this
            // Think of Math.floor(sa.sa.complete_x) === today_minus_assignment_date as Math.floor(sa.sa.complete_x) === Math.floor(complete_today_minus_assignment_date)
            if (sa.sa.soft && due_date_passed && Math.floor(sa.sa.complete_x) === today_minus_assignment_date) {
                // If complete_x = 2.5, today_minus_assignment_date = 2 (but the raw value is 2.75), and sa.sa.blue_line_start + len_works is 2, then number_of_forgotten_days = 0
                // However, this will mean nothing will autofill
                // Increment number_of_forgotten_days to fix this
                number_of_forgotten_days++;
            }
            if (!sa.sa.needs_more_info && that.params.autofill_all_work_done && number_of_forgotten_days > 0) {
                let has_autofilled = false;
                for (let i = 0; i < number_of_forgotten_days; i++) {
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                    // Don't use "sa.sa.soft" logic because this will always complete the assignment if the due date already passed
                    if (len_works + sa.sa.blue_line_start === sa.sa.x) break; // Don't autofill past completion
                    has_autofilled = true;
                    last_work_input += Math.max(0, todo);
                    sa.sa.works.push(last_work_input);
                    len_works++;

                    if (number_of_forgotten_days < Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) {
                        for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                            sa.setDynamicStartIfInDynamicMode();
                            sa.autotuneSkewRatio();
                        }
                        sa.setDynamicStartIfInDynamicMode();
                    }
                }
                if (number_of_forgotten_days >= Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) {
                    for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                        sa.setDynamicStartIfInDynamicMode();
                        sa.autotuneSkewRatio();
                    }
                    sa.setDynamicStartIfInDynamicMode();
                }
                if (has_autofilled) {
                    ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                }
            }
            
            const finished_work_inputs = last_work_input >= sa.sa.y;
            const not_yet_assigned = today_minus_assignment_date < 0;

            let alert_due_date_passed_cond = false;
            let status_value, status_message, status_image, due_date_minus_today;
            if (sa.sa.needs_more_info && !(sa.sa.is_google_classroom_assignment && due_date_passed && !sa.sa.soft)) {
                status_image = 'question-mark';
                if (sa.sa.is_google_classroom_assignment) {
                    status_message = "This Google Classroom Assignment needs more Info!<br>Please Edit this Assignment";
                    status_value = first_real_tag ? Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG : Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT;
                } else {
                    status_message = "This Assignment needs more Info!<br>Please Edit this Assignment";
                    status_value = Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT;
                }
                //hard
                dom_status_image.attr({
                    width: 11,
                    height: 18,
                }).css("margin-left", 2);            
            } else if (finished_work_inputs || due_date_passed && !sa.sa.soft) {
                status_image = "completely-finished";
                if (finished_work_inputs && !(sa.sa.is_google_classroom_assignment && sa.sa.needs_more_info)) {
                    status_message = 'You\'re Completely Finished with this Assignment';
                } else {
                    alert_due_date_passed_cond = true;
                    if (!sa.sa.has_alerted_due_date_passed_notice) {
                        // sa.sa.has_alerted_due_date_passed_notice will only be set to true after the user closes the alert modal
                        that.due_date_passed_notices.push(sa.sa);
                    }
                    status_message = 'This Assignment\'s Due Date has Passed';
                    if (sa.sa.is_google_classroom_assignment && sa.sa.needs_more_info) {
                        status_message = "This Google Classroom Assignment needs more Info!<br>" + status_message;
                    }
                }
                //hard
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
                status_value = Priority.COMPLETELY_FINISHED;
            } else if (not_yet_assigned) {
                status_message = 'This Assignment hasn\'t Yet been Assigned';
                status_value = Priority.NOT_YET_ASSIGNED;
            } else {
                let has_autofilled = false;
                if (that.params.autofill_no_work_done && number_of_forgotten_days > 0)
                    for (let i = 0; i < number_of_forgotten_days; i++) {
                        
                        if (!sa.sa.soft && len_works + sa.sa.blue_line_start === sa.sa.x) {
                            break;
                        }
                        has_autofilled = true;
                        sa.sa.works.push(last_work_input);
                        len_works++;
                        if (number_of_forgotten_days < Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) {
                            for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                                sa.setDynamicStartIfInDynamicMode();
                                sa.autotuneSkewRatio();
                            }
                            sa.setDynamicStartIfInDynamicMode();
                        }
                    }
                /**
                 * 
                 * 1st column: today_minus_assignment_date
                 * 2nd column: sa.sa.x
                 * 3rd column: ideal value for the new due date
                 * 1 5 > 5
                 * 2 5 > 5
                 * 3 5 > 5
                 * 4 5 > 5
                 * 5 5 > 6
                 * 6 6 > 7
                 * 7 7 > 8
                 * 10 7 > 11
                 * We can deduce the following logic to properly set x:
                 */
                const increment_due_date_condition = sa.sa.soft && today_minus_assignment_date >= sa.sa.x;
                if (increment_due_date_condition) {
                    sa.sa.x = today_minus_assignment_date;
                    sa.incrementDueDate();
                }

                if (has_autofilled && number_of_forgotten_days >= Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF || increment_due_date_condition) {
                    for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                        sa.setDynamicStartIfInDynamicMode();
                        sa.autotuneSkewRatio();
                    }
                    sa.setDynamicStartIfInDynamicMode();
                }

                if (has_autofilled) {
                    ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                }

                complete_due_date = new Date(sa.sa.assignment_date.valueOf());
                complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.sa.complete_x));
                if (sa.sa.due_time && (sa.sa.due_time.hour || sa.sa.due_time.minute)) {
                    complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.sa.due_time.hour * 60 + sa.sa.due_time.minute);
                }
                due_date_minus_today = Math.floor(sa.sa.complete_x) - today_minus_assignment_date;
                const todo_is_completed = todo <= 0;
                const current_work_input_is_break_day = sa.sa.break_days.includes((sa.assign_day_of_week + today_minus_assignment_date) % 7);
                const already_entered_work_input_for_today = today_minus_assignment_date < len_works + sa.sa.blue_line_start;
                const incomplete_past_inputs = today_minus_assignment_date > len_works + sa.sa.blue_line_start || complete_due_date <= complete_date_now && sa.sa.soft;
                // Don't mark as no working days when the end of the assignment has been reached
                const no_working_days = sa.getWorkingDaysRemaining({ reference: "blue line end" }) === 0 && len_works + sa.sa.blue_line_start !== sa.sa.x;
                if (incomplete_past_inputs || no_working_days) {
                    status_image = 'question-mark';
                    if (incomplete_past_inputs) {
                        status_message = "You haven't Entered your past Work Inputs!<br>Please Enter your Progress to Continue";
                        status_value = Priority.INCOMPLETE_WORKS;
                    } else {
                        status_message = 'This Assignment has no Working Days!<br>Please Edit this Assignment\'s Work Days';
                        status_value = Priority.NO_WORKING_DAYS;
                    }
                    //hard
                    dom_status_image.attr({
                        width: 11,
                        height: 18,
                    }).css("margin-left", 2);
                } else if (todo_is_completed || already_entered_work_input_for_today || current_work_input_is_break_day) {
                    status_image = 'finished';
                    if (current_work_input_is_break_day) {
                        status_message = 'Today isn\'t a Working Day for this Assignment';
                    } else {
                        status_message = 'Nice Job! You\'re Finished with this Assignment\'s Work for Today';
                    }
                    //hard
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    status_value = Priority.FINISHED_FOR_TODAY;
                } else {
                    status_value = Priority.UNFINISHED_FOR_TODAY;
                    display_format_minutes = true;
                    status_image = 'unfinished';
                    status_message = "<span class=\"unfinished-message\">This Assignment's Daily Work is Unfinished<br></span>";
                    //hard
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    if (sa.unit_is_of_time) {
                        status_message += `Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo)} of Work Today`;
                    } else {
                        status_message += `Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo)} Today`;
                    }
                    that.total_completion_time += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                }

                if ([0, 1].includes(due_date_minus_today)) {
                    if (due_date_minus_today === 0) {
                        that.display_due_today_completion_time = true;
                    } else if (due_date_minus_today === 1) {
                        that.display_due_tomorrow_completion_time = true;
                    }
                    that.today_and_tomorrow_total_completion_time += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                    if (status_value === Priority.UNFINISHED_FOR_TODAY) {
                        status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW;
                    }
                }
            }

            // If the condition to alert the due date has passed is false, set sa.sa.has_alerted_due_date_passed_notice to true
            // This is done so that it doesn't remain as true and fail to alert the user again
            if (!alert_due_date_passed_cond && sa.sa.has_alerted_due_date_passed_notice) {
                sa.sa.has_alerted_due_date_passed_notice = false;
                ajaxUtils.sendAttributeAjaxWithTimeout("has_alerted_due_date_passed_notice", sa.sa.has_alerted_due_date_passed_notice, sa.sa.id);
            }

            if (sa.sa.alert_due_date_incremented) {
                that.due_date_incremented_notices.push(sa.sa);
            }

            let str_daysleft = "";
            let long_str_daysleft = "";
            if (status_value === Priority.NOT_YET_ASSIGNED) {
                if (today_minus_assignment_date === -1) {
                    str_daysleft = 'Assigned Tomorrow';
                } else if (today_minus_assignment_date > -7) {
                    str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                    str_daysleft = `Assigned in ${-today_minus_assignment_date}d`;
                }
                long_str_daysleft = sa.sa.assignment_date.toLocaleDateString("en-US", {month: 'long', day: 'numeric'});
            } else if (Number.isFinite(sa.sa.x)) {
                due_date_minus_today = Math.floor(sa.sa.complete_x) - today_minus_assignment_date;
                const due_date = new Date(sa.sa.assignment_date.valueOf());
                due_date.setDate(due_date.getDate() + Math.floor(sa.sa.complete_x));
                if (due_date_minus_today < -1) {
                    str_daysleft = -due_date_minus_today + "d Ago";
                } else {
                    if (due_date_minus_today === -1) {
                        str_daysleft = 'Yesterday';
                    } else if (due_date_minus_today === 0) {
                        str_daysleft = 'Today';
                    } else if (due_date_minus_today === 1) {
                        str_daysleft = 'Tomorrow';
                    } else if (due_date_minus_today < 7) {
                        str_daysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                    } else {
                        str_daysleft = due_date_minus_today + "d";
                    }
                    if (sa.sa.break_days.length) {
                        // due_date_minus_today floors the due time, so let's also do this on the work days left for consistency
                        // we do this because it doesn't make logical sense to say an assignment is due in 2 days when it is due in 25 hours
                        const remaining_work_days = sa.getWorkingDaysRemaining({ reference: "today", floor_due_time: true });
                        if (remaining_work_days > 0) // NaN is returned if due_date_minus_today is negative. Let's check if it's greater than 0 for readability
                            str_daysleft += ` (${remaining_work_days} work day${remaining_work_days === 1 ? "" : "s"})`;
                    }
                }
                if (complete_date_now.getFullYear() === due_date.getFullYear()) {
                    long_str_daysleft = due_date.toLocaleDateString("en-US", {month: 'long', day: 'numeric'});
                } else {
                    long_str_daysleft = due_date.toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'});
                }
            }
            // Can't just define this once because len_works changes
            const already_entered_work_input_for_today = today_minus_assignment_date < len_works + sa.sa.blue_line_start;
            assignment_container.find(".assignment-header-button").filter(function() {
                return !!$(this).children(".tick-button").length;
            }).toggle(
                !(
                    [Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NOT_YET_ASSIGNED].includes(status_value)
                    || status_value === Priority.COMPLETELY_FINISHED && !already_entered_work_input_for_today
                )
            ).toggleClass("slashed", already_entered_work_input_for_today).children(".tick-button").attr("src", (function() {
                const tick_image = already_entered_work_input_for_today ? "slashed-tick" : "tick";
                return DEBUG ? `/static/timewebapp/images/${tick_image}.svg` : `https://storage.googleapis.com/twstatic/timewebapp/images/${tick_image}.svg`;
            })())

            // Add finished to assignment-container so it can easily be deleted with $(".finished").remove() when all finished assignments are deleted in advanced
            assignment_container.toggleClass("finished", status_value === Priority.COMPLETELY_FINISHED)
                                .toggleClass("incomplete-works", status_value === Priority.INCOMPLETE_WORKS)
                                .toggleClass("question-mark", [Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NO_WORKING_DAYS, Priority.INCOMPLETE_WORKS].includes(status_value))
                                .toggleClass("add-line-wrapper", [Priority.COMPLETELY_FINISHED, Priority.INCOMPLETE_WORKS].includes(status_value));

            let status_priority;
            if (status_value === Priority.COMPLETELY_FINISHED) {
                status_priority = -index;
            } else if (status_value === Priority.NOT_YET_ASSIGNED) {
                status_priority = today_minus_assignment_date;
            } else if ([Priority.FINISHED_FOR_TODAY, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT].includes(status_value)) {
                // Include Priority.FINISHED_FOR_TODAY
                // If you're submitting work inputs for a check marked assignments ahead of time, it might swap with other check marked assignments, if this wasn't here and it went to the end of the if chain, which would make no sense

                // Don't use NaN because NaN === NaN is false for calculations used later
                status_priority = undefined;
            } else {
                // If due times are enabled, it's possible for (sa.sa.complete_x - (sa.sa.blue_line_start - len_works)) to become negative
                // However this doesn't happen because the assignment will have been marked have completed in this scenario
                status_priority = todo * sa.sa.time_per_unit / (sa.sa.complete_x - (sa.sa.blue_line_start + len_works));
            }

            const priority_data = {
                status_value,
                status_priority,
                first_real_tag,
                has_important_tag,
                has_not_important_tag,
                name: sa.sa.name,
                index,
                // Not actually used for sorting, used for priority stuff later on
                mark_as_done: sa.sa.mark_as_done,
            }
            that.priority_data_list.push(priority_data);

            if (status_image) {
                dom_status_image.show();
                dom_status_image.attr("src", DEBUG ? `static/timewebapp/images/${status_image}.png`: `https://storage.googleapis.com/twstatic/timewebapp/images/${status_image}.png`);
            } else {
                dom_status_image.hide();
                dom_status_image.removeAttr("src");
            }
            dom_status_message.html(status_message); // use .html() instead of .text() so that .unfinished-message is parsed as an HTML element
            dom_title.attr("data-daysleft", str_daysleft);
            dom_title.attr("data-long-daysleft", long_str_daysleft);
            // Even though this is always true, it'll add this here for compatibility
            dom_tags.toggleClass("assignment-has-daysleft", SETTINGS.vertical_tag_position === "Bottom" && SETTINGS.horizontal_tag_position === "Left" && !!str_daysleft);
            dom_completion_time.text(display_format_minutes ? utils.formatting.formatMinutes(todo * sa.sa.time_per_unit) : '');
        });
    }
    alertDueDates() {
        const that = this;
        let due_date_passed_notice_title;
        let due_date_passed_notice_content;
        if (that.due_date_passed_notices.length === 1) {
            due_date_passed_notice_title = `Notice: "${that.due_date_passed_notices[0].name}" has been marked as completely finished because its due date has passed.`;
            due_date_passed_notice_content = "You can also enable soft due dates in the assignment form if you want the assignment's due date to automatically increment if you haven't finished it by then.";
        } else if (that.due_date_passed_notices.length > 1) {
            due_date_passed_notice_title = `Notice: ${utils.formatting.arrayToEnglish(that.due_date_passed_notices.map(i => i.name))} have been marked as completely finished because their due dates have passed.`;
            due_date_passed_notice_content = "You can also enable soft due dates in the assignment form if you want the assignments' due dates to automatically increment if you haven't finished them by then.";       
        }
        if (due_date_passed_notice_title && !Priority.due_date_passed_notice_on_screen) {
            Priority.due_date_passed_notice_on_screen = true;
            $.alert({
                title: due_date_passed_notice_title,
                content: due_date_passed_notice_content,
                backgroundDismiss: false,
                buttons: {
                    ok: {
                        action: function() {
                            Priority.due_date_passed_notice_on_screen = false;
                            for (let sa of that.due_date_passed_notices) {
                                sa.has_alerted_due_date_passed_notice = true;
                                ajaxUtils.sendAttributeAjaxWithTimeout("has_alerted_due_date_passed_notice", sa.has_alerted_due_date_passed_notice, sa.id);
                            }
                        }
                    }
                }
            });
        }

        let due_date_incremented_notice_title;
        let due_date_incremented_notice_content;
        if (that.due_date_incremented_notices.length === 1) {
            due_date_incremented_notice_title = `Notice: "${that.due_date_incremented_notices[0].name}" has had its due date incremented because it has soft due dates enabled.`;
            due_date_incremented_notice_content = "This only occurs when an assignment's due date passes, but the assignment still isn't complete. If you don't want this to happen, disable soft due dates in the edit assignment form.";
        } else if (that.due_date_incremented_notices.length > 1) {
            due_date_incremented_notice_title = `Notice: ${utils.formatting.arrayToEnglish(that.due_date_incremented_notices.map(i => i.name))} have had their due dates incremented because they have soft due dates enabled.`;
            due_date_incremented_notice_content = "This only occurs when an assignment's due date passes, but the assignment still isn't complete. If you don't want this to happen, disable soft due dates in the edit assignment form.";
        }
        if (due_date_incremented_notice_title && !Priority.due_date_incremented_notice_on_screen) {
            Priority.due_date_incremented_notice_on_screen = true;
            $.alert({
                title: due_date_incremented_notice_title,
                content: due_date_incremented_notice_content,
                backgroundDismiss: false,
                buttons: {
                    ok: {
                        action: function() {
                            Priority.due_date_incremented_notice_on_screen = false;
                            for (let sa of that.due_date_incremented_notices) {
                                sa.alert_due_date_incremented = false;
                                ajaxUtils.sendAttributeAjaxWithTimeout("alert_due_date_incremented", sa.alert_due_date_incremented, sa.id);
                            }
                        }
                    }
                }
            });
        }
    }
    assignmentSortingComparator(a, b) {
        const that = this;

        if (SETTINGS.assignment_sorting === "Tag Name") {

            // b.first_real_tag === undefined: Treat undefined as the highst index lexicographic string

            // "r" < "z" => true
            // "r" < undefined => false (the below makes this true)
            
            // "z" > "r" => true
            // undefined > "r" => false (the below makes this true)
            
            // a.first_real_tag !== undefined: If both are undefined, skip this check
            if (a.first_real_tag < b.first_real_tag || b.first_real_tag === undefined && a.first_real_tag !== undefined) return -1;
            if (a.first_real_tag > b.first_real_tag || a.first_real_tag === undefined && b.first_real_tag !== undefined) return 1;
        }

        
        let a_status_value = a.status_value;
        let b_status_value = b.status_value;
        // +Ignore tags if its a google classroom assignment and it needs more info because important and not important can mess up some ordering
        // -Not needed anymore because of Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG
        // if (!(sa.sa.is_google_classroom_assignment && sa.sa.needs_more_info)) {
            if (a.has_important_tag) {
                a_status_value += 0.25;
            }
            if (a.has_not_important_tag) {
                a_status_value -= 0.25;
            }
            if (b.has_important_tag) {
                b_status_value += 0.25;
            }
            if (b.has_not_important_tag) {
                b_status_value -= 0.25;
            }
            // }

        // Max to min
        if (a_status_value < b_status_value) return 1;
        if (a_status_value > b_status_value) return -1;

        // a.status_value and b.status_value must be equal at this point, so define a shared variable for readability
        let status_value = a.status_value;

        if (!SETTINGS.assignment_sorting === "Reversed" && [Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG].includes(status_value) 
        || SETTINGS.assignment_sorting === "Reversed" && [Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(status_value)) {
            // If the assignment is a google classroom assignment that needs more info and has a first tag (because the status priority is now their first tag) or is sorting in reverse, sort from min to max
            if (a.status_priority < b.status_priority) return -1;
            if (a.status_priority > b.status_priority) return 1;
        } else {
            if (a.status_priority < b.status_priority) return 1;
            if (a.status_priority > b.status_priority) return -1;
        }
        if (a.first_real_tag < b.first_real_tag || b.first_real_tag === undefined && a.first_real_tag !== undefined) return -1;
        if (a.first_real_tag > b.first_real_tag || a.first_real_tag === undefined && b.first_real_tag !== undefined) return 1;

        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;

        // If everything is the same, sort them by their index, which will always be different from each other
        // Sort from min to max otherwise they will infinitly swap with each other every time they are resorted
        if (a.index < b.index) return -1;
        if (a.index > b.index) return 1;
    }
    priorityDataToPriorityPercentage(priority_data) {
        const that = this;

        if (priority_data.mark_as_done || [Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NO_WORKING_DAYS, Priority.INCOMPLETE_WORKS].includes(priority_data.status_value)) {
            var priority_percentage = NaN;
        } else if ([Priority.FINISHED_FOR_TODAY, Priority.NOT_YET_ASSIGNED, Priority.COMPLETELY_FINISHED].includes(priority_data.status_value) /* Priority.NOT_YET_ASSIGNED needed for "This assignment has not yet been assigned" being set to color values greater than 1 */) {
            var priority_percentage = 0;
        } else {
            var priority_percentage = Math.max(1, Math.floor(priority_data.status_priority / that.highest_priority * 100 + 1e-10));
            if (!Number.isFinite(priority_percentage)) {
                priority_percentage = 100;
            }
        }
        return priority_percentage;
    }
    addAssignmentShortcut(dom_assignment, priority_data) {
        const that = this;
        // Loops through every google classroom assignment that needs more info AND has a tag (representing their class) to add "delete all assignments of this class"
        // Uses the same below logic for delete starred assignments and autoill work done

        // This has to be looped before they are sorted so setInitialAssignmentTopOffset is accurate
        // This means we can't loop through ".assignment-container" because it's currently unsorted, so we instead have to loop through that.priority_data_list
        // The current looped assignment's tag is compared with the previous looped assignment's tag
        // If they are different, the previous assignment is the last assignment with its tag and the current assignment is the first assignment with its tag
        const sa = utils.loadAssignmentData(dom_assignment);

        if (!["Not Important", "Important"].includes(sa.tags[0]))
            var current_tag = sa.tags[0];
        if (sa.is_google_classroom_assignment && sa.needs_more_info && !dom_assignment.parents(".assignment-container").hasClass("finished") && current_tag) {
            const assignment_container = dom_assignment.parents(".assignment-container");
            assignment_container.addClass("add-line-wrapper");
            if (current_tag !== that.prev_tag) { // Still works if an assignment needs more info but doesn't have a tag
                if (that.prev_assignment_container) that.prev_assignment_container.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($("#delete-gc-assignments-from-class-template").html());
            }
            that.prev_tag = current_tag;
            that.prev_assignment_container = assignment_container;
        }

        if (priority_data.status_value === Priority.INCOMPLETE_WORKS && !that.already_found_first_incomplete_works) {
            $("#autofill-work-done").show().insertBefore(dom_assignment);
            that.already_found_first_incomplete_works = true;
        }
        if (priority_data.status_value === Priority.COMPLETELY_FINISHED && !that.already_found_first_finished) {
            $("#delete-starred-assignments").show().insertBefore(dom_assignment);
            that.already_found_first_finished = true;
        }
    }
    updateInfoHeader() {
        const that = this;
        if (!that.total_completion_time) {
            $("#estimated-total-time, #current-time, #tomorrow-time").removeClass("hide-info");
            $("#current-time, #tomorrow-time, #hide-button, #estimated-total-time-label").hide();
            $("#estimated-total-time").text(dat.length ? 'You have Finished Everything for Today!' : 'You Don\'t have any Assignments');
        } else {
            $("#hide-button").text() === "Show" && $("#estimated-total-time, #current-time, #tomorrow-time").addClass("hide-info");
            $("#current-time, #tomorrow-time, #hide-button, #estimated-total-time-label").show();
            $("#estimated-total-time").text(` ${utils.formatting.formatMinutes(that.total_completion_time)}`).attr("data-minutes", that.total_completion_time);

            let relative_today_and_tomorrow_date;
            if (that.display_due_today_completion_time && that.display_due_tomorrow_completion_time) {
                relative_today_and_tomorrow_date = "Today and Tomorrow";
            } else if (that.display_due_today_completion_time) {
                relative_today_and_tomorrow_date = "Today";
            } else {
                relative_today_and_tomorrow_date = "Tomorrow";
            }
            $("#tomorrow-time").text(` (${utils.formatting.formatMinutes(that.today_and_tomorrow_total_completion_time)} due ${relative_today_and_tomorrow_date})`);
        }
        utils.ui.tickClock({ force_update: true });
        if (that.params.first_sort) {
            setInterval(utils.ui.tickClock, 1000);
        }
    }
    sort(params={first_sort: false, autofill_all_work_done: false, autofill_no_work_done: false, timeout: false}) {
        const that = this;
        that.params = params;
        clearTimeout(that.sort_timeout);
        if (that.params.timeout) {
            that.sort_timeout = setTimeout(() => that.sortWithoutTimeout(), Priority.SORT_TIMEOUT_DURATION);
        } else {
            that.sortWithoutTimeout();
        }
    }
    sortWithoutTimeout() {
        const that = this;
        that.updateAssignmentHeaderMessagesAndSetPriorityData();
        that.alertDueDates();
        
        // Updates open graphs' today line and other graph text
        $(window).trigger("resize");
        that.priority_data_list.sort((a, b) => that.assignmentSortingComparator(a, b));
        // /* Source code lurkers, uncomment this for some fun */function shuffleArray(array) {for (var i = array.length - 1; i > 0; i--) {var j = Math.floor(Math.random() * (i + 1));var temp = array[i];array[i] = array[j];array[j] = temp;}};shuffleArray(that.priority_data_list);
        that.highest_priority = Math.max(...that.priority_data_list.map(function(priority_data) {
            if ([Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(priority_data.status_value) && !priority_data.mark_as_done) {
                return priority_data.status_priority;
            } else {
                return -Infinity;
            }
        }));
        let first_available_tutorial_assignment_fallback;
        let first_available_tutorial_assignment;
        $("#autofill-work-done, #delete-starred-assignments").hide();
        $(".delete-gc-assignments-from-class").remove();
        $(".first-add-line-wrapper, .last-add-line-wrapper").removeClass("first-add-line-wrapper last-add-line-wrapper");
        for (let [index, priority_data] of that.priority_data_list.entries()) {
            const dom_assignment = $(".assignment").eq(priority_data.index);
            const assignment_container = dom_assignment.parents(".assignment-container");

            if (!first_available_tutorial_assignment_fallback) {
                first_available_tutorial_assignment_fallback = dom_assignment;
            }

            let priority_percentage = that.priorityDataToPriorityPercentage(priority_data);
            const add_priority_percentage = SETTINGS.show_priority && [Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(priority_data.status_value) && !priority_data.mark_as_done;
            const dom_title = $(".title").eq(priority_data.index);
            dom_title.attr("data-priority", add_priority_percentage ? `Priority: ${priority_percentage}%` : "");

            new Promise(function(resolve) {
                if (that.params.first_sort) {
                    $(window).one("load", resolve);
                } else {
                    resolve();
                }
            }).then(function() {
                new VisualAssignment(dom_assignment).positionTags();
            });
            if (that.params.first_sort && assignment_container.is("#animate-color, #animate-in")) {
                new Promise(function(resolve) {
                    $(window).one('load', function() {
                        // Since "#animate-in" will have a bottom margin of negative its height, the next assignment will be in its final position at the start of the animation
                        // So, scroll to the next assignment instead
                        // Scroll to dom_assignment because of its scroll-margin
                        let assignment_to_scroll_to = $(".assignment").eq(that.priority_data_list[index + 1] ? that.priority_data_list[index + 1].index : undefined);
                        if (!assignment_to_scroll_to.length || $("#animate-color").length) {
                            // If "#animate-color" exists or "#animate-in" is the last assignment on the list, scroll to itself instead
                            assignment_to_scroll_to = dom_assignment;
                        }
                        setTimeout(function() {
                            setTimeout(function() {
                                // scrollIntoView sometimes doesn't work without two setTimeouts
                                assignment_to_scroll_to[0].scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                });
                            }, 0);
                        }, 0);

                        let scrollTimeout = setTimeout(resolve, 200);
                        $("main").scroll(() => {
                            clearTimeout(scrollTimeout);
                            scrollTimeout = setTimeout(resolve, 200);
                        });
                    });
                }).then(function() {
                    $("main").off('scroll');
                    that.colorOrAnimateInAssignment({
                        dom_assignment,
                        mark_as_done: priority_data.mark_as_done,
                        is_element_submitted: true,
                        priority_percentage,
                        first_sort: that.params.first_sort,
                    });
                });
            } else {
                that.colorOrAnimateInAssignment({
                    dom_assignment,
                    mark_as_done: priority_data.mark_as_done,
                    is_element_submitted: true,
                    priority_percentage,
                    first_sort: that.params.first_sort,
                });
            }
            that.addAssignmentShortcut(dom_assignment, priority_data);
            if (!first_available_tutorial_assignment && !assignment_container.hasClass("question-mark") && !dom_assignment.hasClass("assignment-is-deleting")) {
                first_available_tutorial_assignment = dom_assignment;
            }
        }
        // End part of addAssignmentShortcut
        if (that.prev_assignment_container) {
            that.prev_assignment_container.addClass("last-add-line-wrapper");
        }

        if (!first_available_tutorial_assignment) {
            first_available_tutorial_assignment = first_available_tutorial_assignment_fallback;
        }
        utils.ui.insertTutorialMessages(first_available_tutorial_assignment);

        if (!that.params.first_sort)
            $(".assignment-container").each(function() {
                that.setInitialAssignmentTopOffset($(this));
            });
        that.domSortAssignments(that.priority_data_list);

        if (!that.params.first_sort)
            $(".assignment-container").each(function() {
                const assignment_container = $(this);
                that.transitionSwap(assignment_container);
            });

        // Make sure this is set after assignments are sorted and swapped
        if (that.params.first_sort && $("#animate-in").length) {
            // Set initial transition values for "#animate-in"
            // Needs to be after domswap or else "top" bugs out 
            
            // First paint is before the fonts are loaded; #animate-in is shown
            // Use opacity 0 instead of display none so getClientRects() works in utils.js
            $("#animate-in").css({
                position: "absolute",
                opacity: 0,
            })
            // Load the fonts first or height() may return the wrong values
            document.fonts.ready.then(function() {
                $("#animate-in").css({
                    position: "",
                    top: $("#assignments-container").offset().top + $("#assignments-container").outerHeight() - $("#animate-in").offset().top + Priority.ANIMATE_IN_START_MARGIN,
                    marginBottom: -$("#animate-in").outerHeight(),
                });
            });
        }
        // Replicates first-of-class and last-of-class to draw the shortcut line wrapper in index.css
        $(".finished").first().addClass("first-add-line-wrapper");
        $(".finished").last().addClass("last-add-line-wrapper");
        $(".incomplete-works").first().addClass("first-add-line-wrapper");
        $(".incomplete-works").last().addClass("last-add-line-wrapper");


        that.updateInfoHeader();
        $("#assignments-container").css("opacity", "1");
        
    }
}
document.addEventListener("DOMContentLoaded", function() {
    new Priority().sort({ first_sort: true });
});