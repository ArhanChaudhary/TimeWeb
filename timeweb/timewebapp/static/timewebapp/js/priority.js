// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Priority {
    static ANIMATE_IN_DURATION = 1500 * SETTINGS.animation_speed;
    static SWAP_TRANSITION_DELAY_FUNCTION = transform_value => (1.75 + Math.abs(transform_value) / 2000) * SETTINGS.animation_speed;
    static ANIMATE_IN_START_MARGIN = 120; // Moves #animate-in a bit below the last assignment to give it more breathing room
    static TOO_MUCH_TO_AUTOFILL_CUTOFF = 100;
    
    static INCOMPLETE_WORKS = 11;
    static NO_WORKING_DAYS = 10;
    static NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG = 9;
    static NEEDS_MORE_INFO_AND_GC_ASSIGNMENT = 8;
    static NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT = 7;
    static UNFINISHED_FOR_TODAY_AND_DUE_TODAY = 6;
    static UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW = 5;
    static UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW = 4;
    static UNFINISHED_FOR_TODAY = 3;
    static FINISHED_FOR_TODAY = 2;
    static NOT_YET_ASSIGNED = 1;
    static COMPLETELY_FINISHED = 0;

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
            }, Priority.ANIMATE_IN_DURATION, "easeOutCubic", () => {$("#extra-navs").show()});
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        setTimeout(() => {
            if (params.first_sort) {
                params.dom_assignment.addClass("transition-instantly");
            }
            if (isNaN(params.priority_percentage) || !SETTINGS.show_priority) {
                params.dom_assignment.css("--priority-color", "var(--color)");
            } else {
                const priority_color = that.percentageToColor(params.priority_percentage);
                params.dom_assignment.css("--priority-color", `rgb(${priority_color.r}, ${priority_color.g}, ${priority_color.b})`);
            }
            if (params.first_sort) {
                // Which element specifically is overflowed seems to have minimal effect on performance
                params.dom_assignment[0].offsetHeight;
                params.dom_assignment.removeClass("transition-instantly");
            }
        }, 0);
    }
    // complete_date_now isn't actually needed, just so we don't need to call new Date() again
    static generateDaysleftMessages(sa, complete_date_now) {
        const that = this;
        let str_daysleft;
        let long_str_daysleft;
        let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
        if (today_minus_assignment_date < 0) {
            if (today_minus_assignment_date === -1) {
                str_daysleft = 'Assigned Tomorrow';
            } else if (today_minus_assignment_date > -7) {
                str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString([], {weekday: 'long'})}`;
            } else {
                str_daysleft = `Assigned in ${-today_minus_assignment_date}d`;
            }
            long_str_daysleft = sa.sa.assignment_date.toLocaleDateString([], {month: 'long', day: 'numeric'});
        } else if (Number.isFinite(sa.sa.x)) {
            const due_date_minus_today = Math.floor(sa.sa.complete_x) - today_minus_assignment_date;
            const due_date = new Date(sa.sa.assignment_date.valueOf());
            due_date.setDate(due_date.getDate() + Math.floor(sa.sa.complete_x));
            if (due_date_minus_today < -1) {
                str_daysleft = -due_date_minus_today + "d Ago";
            } else {
                if (due_date_minus_today === -1) {
                    str_daysleft = 'Yesterday';
                } else if (due_date_minus_today >= 0 && due_date_minus_today < 7) {
                    if (due_date_minus_today === 0) {
                        str_daysleft = 'Today';
                    } else if (due_date_minus_today === 1) {
                        str_daysleft = 'Tomorrow';
                    } else if (due_date_minus_today < 7) {
                        str_daysleft = due_date.toLocaleDateString([], {weekday: 'long'});
                    }
                    if (sa.sa.due_time && sa.sa.due_time.hour === 23 && sa.sa.due_time.minute === 59) {
                        str_daysleft = "End of " + str_daysleft;
                    }
                } else {
                    str_daysleft = due_date_minus_today + "d";
                }
                if (sa.sa.break_days.length) {
                    // due_date_minus_today floors the due time, so let's also do this on the work days left for consistency
                    // we do this because it doesn't make logical sense to say an assignment is due in 2 days when it is due in 25 hours
                    const remaining_work_days = sa.getWorkingDaysRemaining({ reference: "today", floor_due_time: true });
                    if (remaining_work_days > 0 // NaN is returned if due_date_minus_today is negative. Let's check if it's greater than 0 for readability
                        && due_date_minus_today !== remaining_work_days)
                        str_daysleft += ` (${remaining_work_days} work day${remaining_work_days === 1 ? "" : "s"})`;
                }
            }
            if (complete_date_now.getFullYear() === due_date.getFullYear()) {
                long_str_daysleft = due_date.toLocaleDateString([], {month: 'long', day: 'numeric'});
            } else {
                long_str_daysleft = due_date.toLocaleDateString([], {year: 'numeric', month: 'long', day: 'numeric'});
            }
        } else {
            str_daysleft = "";
            long_str_daysleft = "";
        }
        return {str_daysleft, long_str_daysleft};
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
        const swap_temp = $("<span>");
        // ideally use a shitty virtual dom here or smtn
        tar2.after(swap_temp);
        tar1.after(tar2);
        swap_temp.replaceWith(tar1);
    }

    transitionSwap(assignment_container) {
        const initial_height = assignment_container.attr("data-initial-top-offset");
        let current_translate_value = (assignment_container.css("transform").split(",")[5]||")").slice(0,-1); // Read the translateY value from the returned MATRIX_ENDS_WEIGHT
        // Assignments can move while this is being executed; current_translate_value becomes old inaccurate
        // Account for this for this execution time inconsistency by multiplying it by an eyeballed adjustment factor of 0.9
        current_translate_value *= 0.9
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
        const complete_date_now = utils.getRawDateNow();
        const starred_assignment_ids_to_delete_after_sorting = new Set();
        $(".assignment").each(function(index) {
            const dom_assignment = $(this);
            const assignment_container = dom_assignment.parent();
            const sa = new Assignment(dom_assignment);

            // Remember: protect ajaxs with !sa.sa.needs_more_info
            const skew_ratio_bound = sa.calcSkewRatioBound();
            if (sa.sa.skew_ratio > skew_ratio_bound) {
                sa.sa.skew_ratio = skew_ratio_bound;
                !sa.sa.needs_more_info && ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {skew_ratio: sa.sa.skew_ratio, id: sa.sa.id});
            } else if (sa.sa.skew_ratio < 2 - skew_ratio_bound) {
                sa.sa.skew_ratio = 2 - skew_ratio_bound;
                !sa.sa.needs_more_info && ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {skew_ratio: sa.sa.skew_ratio, id: sa.sa.id});
            }
            
            sa.setParabolaValues();
            if (that.params.first_sort && !sa.sa.needs_more_info && dom_assignment.hasClass("refresh-dynamic-mode")) {
                // Fix dynamic start if y or anything else was changed
                // setParabolaValues needs to be above for it doesn't run in this function with fixed mode
                if (sa.shouldAutotune({ skip_work_days_check: true }))
                for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                    sa.setDynamicStartIfInDynamicMode();
                    sa.autotuneSkewRatioIfInDynamicMode();
                }
                sa.setDynamicStartIfInDynamicMode();
            }
                
            let display_format_minutes = false;
            let delete_starred_assignment_after_sorting = false;
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
            let todo = sa.funct(len_works + sa.sa.blue_line_start + 1) - last_work_input;
            const dom_status_image = $(".status-image").eq(index),
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
            
            // This evaluates to false if complete_due_date or complete_date_now are invalid dates
            const due_date_passed = complete_due_date <= complete_date_now;

            const soft_due_date_passed = sa.sa.soft && due_date_passed;
            const hard_due_date_passed = !sa.sa.soft && due_date_passed;

            let number_of_forgotten_days = today_minus_assignment_date - (sa.sa.blue_line_start + len_works); // Make this a variable so len_works++ doesn't affect this
            // Think of Math.floor(sa.sa.complete_x) === today_minus_assignment_date as Math.floor(sa.sa.complete_x) === Math.floor(complete_today_minus_assignment_date)
            if (soft_due_date_passed && Math.floor(sa.sa.complete_x) === today_minus_assignment_date) {
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
                            sa.autotuneSkewRatioIfInDynamicMode();
                        }
                        sa.setDynamicStartIfInDynamicMode();
                    }
                }
                if (number_of_forgotten_days >= Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) {
                    for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                        sa.setDynamicStartIfInDynamicMode();
                        sa.autotuneSkewRatioIfInDynamicMode();
                    }
                    sa.setDynamicStartIfInDynamicMode();
                }
                if (has_autofilled) {
                    ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {works: sa.sa.works.map(String), id: sa.sa.id});
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                }
            }
            
            // if sa.sa.y is null, I would expect finished_work_inputs to be false
            // However, inequalities with null can sometimes be true!
            // Check if sa.sa.y is a number, and do the same for last_work_input for extra precaution
            const finished_work_inputs = last_work_input >= sa.sa.y && Number.isFinite(sa.sa.y) && Number.isFinite(last_work_input);
            const not_yet_assigned = today_minus_assignment_date < 0;

            let alert_due_date_passed_cond = false;
            let status_value, status_message, status_image, due_date_minus_today;

            // hard_due_date_passed
            // This marks the assignment as completed if its due date passes
            // However, if the due date is soft, the system doesnt know whether or not the user finished the assignment or needs to extend its due date
            // So, dont star it because the user may misinterpret that as having completed the assignment when in reality the user may need an extension
            // Instead, give it a question mark so it can be appropriately handled
            if (sa.sa.needs_more_info && !hard_due_date_passed) {
				status_image = 'question_mark';
                if (sa.sa.is_google_classroom_assignment) {
                    status_message = "This Google Classroom assignment needs more info";
                    status_value = first_real_tag ? Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG : Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT;
                } else {
                    status_message = "This assignment needs more info";
                    status_value = Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT;
                }
                // due_date_minus_today can be NaN sometimes and break the logic in assignmentSortingComparator
				if (Number.isFinite(Math.floor(sa.sa.complete_x) - today_minus_assignment_date))
					due_date_minus_today = Math.floor(sa.sa.complete_x) - today_minus_assignment_date;
                //hard
                dom_status_image.attr({
                    width: 11,
                    height: 18,
                }).css("margin-left", 2);            
            } else if (finished_work_inputs || hard_due_date_passed) {
                status_image = "completely_finished";
                if (finished_work_inputs) {
                    status_message = 'You\'re completely finished with this assignment';
                } else {
					alert_due_date_passed_cond = true;
                    if (assignment_container.is("#animate-in, #animate-color")) {
						sa.sa.has_alerted_due_date_passed_notice = true;
						ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {has_alerted_due_date_passed_notice: sa.sa.has_alerted_due_date_passed_notice, id: sa.sa.id});
					}
                    status_message = 'This assignment\'s due date has passed';
                    if (sa.sa.needs_more_info)
                        if (sa.sa.is_google_classroom_assignment)
                            status_message = "This Google Classroom assignment needs more info but passed its due date";
                        else
                            status_message = "This assignment needs more info but passed its due date";
                }
                //hard
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
                status_value = Priority.COMPLETELY_FINISHED;
                // finished_work_inputs to ensure that assignments are only deleted when the user is aware
                if (finished_work_inputs && SETTINGS.immediately_delete_completely_finished_assignments && !sa.sa.dont_hide_again)
                    delete_starred_assignment_after_sorting = true;
            } else if (not_yet_assigned) {
                status_image = "not_yet_assigned";
                status_message = 'This assignment hasn\'t yet been assigned';
                status_value = Priority.NOT_YET_ASSIGNED;
                //hard
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
            } else {
                let has_autofilled = false;
                if (that.params.autofill_no_work_done && number_of_forgotten_days > 0)
                    for (let i = 0; i < number_of_forgotten_days; i++) {
                        
                        if (!sa.sa.soft && len_works + sa.sa.blue_line_start === sa.sa.x) break;
                        has_autofilled = true;
                        sa.sa.works.push(last_work_input);
                        len_works++;
                        if (sa.shouldAutotune() && number_of_forgotten_days < Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) {
                            for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                                sa.setDynamicStartIfInDynamicMode();
                                sa.autotuneSkewRatioIfInDynamicMode();
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
                    if (sa.shouldAutotune())
                    for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                        sa.setDynamicStartIfInDynamicMode();
                        sa.autotuneSkewRatioIfInDynamicMode();
                    }
                    sa.setDynamicStartIfInDynamicMode();
                }

                if (has_autofilled) {
                    ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {works: sa.sa.works.map(String), id: sa.sa.id});
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
                    status_image = 'question_mark';
                    if (incomplete_past_inputs) {
                        status_message = "Please enter your past work inputs to continue";
                        status_value = Priority.INCOMPLETE_WORKS;
                    } else {
                        status_message = 'This assignment has no more working days';
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
                        status_message = 'Today isn\'t a working day for this assignment';
                    } else {
                        status_message = 'You\'re finished with this assignment\'s work for today';
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
                    //hard
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    if (todo + last_work_input === sa.sa.y) {
                        status_message = "Finish this assignment today";
                    } else {
                        status_message = `Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo).toLowerCase()} ${sa.unit_is_of_time ? "of work " : ""}`;
                    }
                    that.total_completion_time += Math.ceil(todo*sa.sa.time_per_unit);
                }

                if ([0, 1].includes(due_date_minus_today)) {
                    if (status_value === Priority.UNFINISHED_FOR_TODAY) {
                        // we don't want a question mark and etc assignment due tomorrow toggle the tomorrow or today completion time
                        // when it in fact displays no useful information
                        if (due_date_minus_today === 0) {
                            // hurry the F*CK up >:(
                            that.display_due_today_completion_time = true;
                            status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY;
                        } else if (due_date_minus_today === 1) {
                            that.display_due_tomorrow_completion_time = true;
                            if (sa.sa.due_time && sa.sa.due_time.hour === 23 && sa.sa.due_time.minute === 59)
                                status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW;
                            else
                                status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW;
                        }
                    }
                    that.today_and_tomorrow_total_completion_time += Math.ceil(todo*sa.sa.time_per_unit);
                }
            }

            if (status_value !== Priority.COMPLETELY_FINISHED && sa.sa.dont_hide_again) {
                sa.sa.dont_hide_again = false;
                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {dont_hide_again: sa.sa.dont_hide_again, id: sa.sa.id});
            }

			if (alert_due_date_passed_cond && !sa.sa.has_alerted_due_date_passed_notice) {
				// sa.sa.has_alerted_due_date_passed_notice will only be set to true after the user closes the alert modal
				that.due_date_passed_notices.push(sa.sa);
			// If the condition to alert the due date has passed is false, set sa.sa.has_alerted_due_date_passed_notice to true
            // This is done so that it doesn't remain as true and fail to alert the user again
			} else if (!alert_due_date_passed_cond && sa.sa.has_alerted_due_date_passed_notice) {
                sa.sa.has_alerted_due_date_passed_notice = false;
                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {has_alerted_due_date_passed_notice: sa.sa.has_alerted_due_date_passed_notice, id: sa.sa.id});
            }

            if (sa.sa.alert_due_date_incremented) {
                that.due_date_incremented_notices.push(sa.sa);
            }

            let {str_daysleft, long_str_daysleft} = Priority.generateDaysleftMessages(sa, complete_date_now);
            dom_title.attr("data-daysleft", str_daysleft);
            dom_title.attr("data-long-daysleft", long_str_daysleft);
            
            const already_entered_work_input_for_today = today_minus_assignment_date < len_works + sa.sa.blue_line_start; // Can't just define this once because len_works changes
            const assignment_header_button = assignment_container.find(".assignment-header-button");
            const assignment_header_tick_svg = assignment_header_button.find(".tick-button");
            const tick_image = already_entered_work_input_for_today ? "slashed_tick" : "tick";
            assignment_header_tick_svg.parents(".assignment-header-button").toggle(
                !(
                    [Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NOT_YET_ASSIGNED].includes(status_value)
                    // don't show a check mark or star icon and an unslashed tick
                    || [Priority.FINISHED_FOR_TODAY, Priority.COMPLETELY_FINISHED].includes(status_value) && !already_entered_work_input_for_today
                )
            ).toggleClass("slashed", already_entered_work_input_for_today);
            let href = `#${tick_image}-svg`;
            assignment_header_tick_svg.find("use").attr("href", href);
            assignment_header_tick_svg.attr("viewBox", (function() {
                if (!Priority.BBoxCache)
                    Priority.BBoxCache = {};
                let bbox;
                if (href in Priority.BBoxCache) {
                    bbox = Priority.BBoxCache[href];
                } else {
                    bbox = assignment_header_tick_svg[0].getBBox();
                    if (!(bbox.x === 0 && bbox.y === 0 && bbox.width === 0 && bbox.height === 0))
                        Priority.BBoxCache[href] = bbox;
                }
                return `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
            })());
            
            // Add finished to assignment-container so it can easily be deleted with $(".finished").remove() when all finished assignments are deleted in advanced
            if (delete_starred_assignment_after_sorting && !assignment_container.hasClass("delete-this-starred-assignment")) {
                starred_assignment_ids_to_delete_after_sorting.add(sa.sa.id);
            }
            assignment_container.toggleClass("finished", status_value === Priority.COMPLETELY_FINISHED)
                                .toggleClass("incomplete-works", status_value === Priority.INCOMPLETE_WORKS)
                                .toggleClass("question-mark", [Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NO_WORKING_DAYS, Priority.INCOMPLETE_WORKS].includes(status_value))
                                .toggleClass("add-line-wrapper", [Priority.COMPLETELY_FINISHED, Priority.INCOMPLETE_WORKS].includes(status_value))
                                .toggleClass("delete-this-starred-assignment", delete_starred_assignment_after_sorting);

            let status_priority;
            if (status_value === Priority.COMPLETELY_FINISHED) {
                status_priority = -index;
            } else if (status_value === Priority.NOT_YET_ASSIGNED) {
                status_priority = today_minus_assignment_date;
            } else if ([Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT].includes(status_value)) {
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
                due_date_minus_today,
                name: sa.sa.name.toLowerCase(),
                index,
            }
            that.priority_data_list.push(priority_data);

            if (status_image) {
                dom_status_image.show();
                let href = `#${status_image}-svg`;
                dom_status_image.find("use").attr("href", href);
                if (!Priority.BBoxCache)
                    Priority.BBoxCache = {};
                let bbox;
                if (href in Priority.BBoxCache) {
                    bbox = Priority.BBoxCache[href];
                } else {
                    bbox = dom_status_image[0].getBBox();
                    if (!(bbox.x === 0 && bbox.y === 0 && bbox.width === 0 && bbox.height === 0))
                        Priority.BBoxCache[href] = bbox;
                }
                dom_status_image.attr("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
            } else {
                dom_status_image.hide();
                dom_status_image.find("use").removeAttr("href");
            }
            dom_status_message.html(status_message); // use .html() instead of .text() so that .unfinished-message is parsed as an HTML element
            // Even though this is always true, it'll add this here for compatibility
            dom_tags.toggleClass("assignment-has-daysleft", SETTINGS.vertical_tag_position === "Bottom" && SETTINGS.horizontal_tag_position === "Left" && !!str_daysleft);
            dom_completion_time.text(display_format_minutes ? utils.formatting.formatMinutes(todo * sa.sa.time_per_unit) : '').toggleClass("hide-on-mobile", !!sa.unit_is_of_time);
        });
        if (!starred_assignment_ids_to_delete_after_sorting.size) return;

        const success = function() {
            new Crud().transitionDeleteAssignment($(".assignment-container.delete-this-starred-assignment > .assignment"));
        }
        if (ajaxUtils.disable_ajax) {
            success();
            return;
        }
        $.ajax({
            type: "POST",
            url: "/api/delete-assignment",
            data: {assignments: [...starred_assignment_ids_to_delete_after_sorting]},
            success: success,
            error: ajaxUtils.error,
        });
    }
    alertDueDates() {
        const that = this;
        let due_date_passed_notice_title;
        if (that.due_date_passed_notices.length === 1) {
            due_date_passed_notice_title = `Notice: "${that.due_date_passed_notices[0].name}" has been marked as completely finished because its due date has passed.`;
        } else if (that.due_date_passed_notices.length > 1) {
            due_date_passed_notice_title = `Notice: ${utils.formatting.arrayToEnglish(that.due_date_passed_notices.map(i => i.name))} have been marked as completely finished because their due dates have passed.`;
        }
        if (due_date_passed_notice_title && !Priority.due_date_passed_notice_on_screen) {
            Priority.due_date_passed_notice_on_screen = true;
            $.alert({
                title: due_date_passed_notice_title,
                content: "You can also enable soft due dates in the assignment form if you want your assignments' due dates to automatically increment if you haven't finished them by then.",
                backgroundDismiss: false,
                buttons: {
                    ok: {
                        action: function() {
                            Priority.due_date_passed_notice_on_screen = false;
                            for (let sa of that.due_date_passed_notices) {
                                sa.has_alerted_due_date_passed_notice = true;
                                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {has_alerted_due_date_passed_notice: sa.has_alerted_due_date_passed_notice, id: sa.id});
                            }
                        }
                    }
                },
            });
        }

        let due_date_incremented_notice_title;
        let due_date_incremented_notice_content;
        if (that.due_date_incremented_notices.length === 1) {
            due_date_incremented_notice_title = `Notice: "${that.due_date_incremented_notices[0].name}" has had its due date incremented because it has soft due dates enabled.`;
        } else if (that.due_date_incremented_notices.length > 1) {
            due_date_incremented_notice_title = `Notice: ${utils.formatting.arrayToEnglish(that.due_date_incremented_notices.map(i => i.name))} have had their due dates incremented because they have soft due dates enabled.`;
        }
        due_date_incremented_notice_content = "This only occurs when an assignment's due date passes, but the assignment still isn't finished. If you don't want this to happen, disable soft due dates in the edit assignment form.";
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
                                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {alert_due_date_incremented: sa.alert_due_date_incremented, id: sa.id});
                            }
                        }
                    }
                },
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

        if (SETTINGS.assignment_sorting === "Reversed" && [Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY].includes(status_value)) {
            // If the assignment is a google classroom assignment that needs more info and has a first tag (because the status priority is now their first tag) or is sorting in reverse, sort from min to max
            if (a.status_priority < b.status_priority) return -1;
            if (a.status_priority > b.status_priority) return 1;
        } else {
            if (a.status_priority < b.status_priority) return 1;
            if (a.status_priority > b.status_priority) return -1;
        }
        if (a.first_real_tag < b.first_real_tag || b.first_real_tag === undefined && a.first_real_tag !== undefined) return -1;
        if (a.first_real_tag > b.first_real_tag || a.first_real_tag === undefined && b.first_real_tag !== undefined) return 1;

        if ([Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG].includes(status_value)) {
            // b.due_date_minus_today === undefined: Treat undefined as negative infinity

            // 5 < 10 => true
            // undefined < 10 => false (the below makes this true)
            
            // 10 > 5 => true
            // 10 > undefined => false (the below makes this true)
            
            // a.due_date_minus_today !== undefined: If both are undefined, skip this check
            if (a.due_date_minus_today < b.due_date_minus_today || b.due_date_minus_today === undefined && a.due_date_minus_today !== undefined) return -1;
            if (a.due_date_minus_today > b.due_date_minus_today || a.due_date_minus_today === undefined && b.due_date_minus_today !== undefined) return 1;
        }

        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;

        // If everything is the same, sort them by their index, which will always be different from each other
        // Sort from min to max otherwise they will infinitly swap with each other every time they are resorted
        if (a.index < b.index) return -1;
        if (a.index > b.index) return 1;
    }
    priorityDataToPriorityPercentage(priority_data) {
        const that = this;

        if ([Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NO_WORKING_DAYS, Priority.INCOMPLETE_WORKS].includes(priority_data.status_value)) {
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
        const assignment_container = dom_assignment.parents(".assignment-container");

        var current_tag = priority_data.first_real_tag;
        if (sa.is_google_classroom_assignment && sa.needs_more_info && !dom_assignment.parents(".assignment-container").hasClass("finished") && current_tag) {
            assignment_container.addClass("add-line-wrapper");
            if (current_tag !== that.prev_tag) { // Still works if an assignment needs more info but doesn't have a tag
                if (that.prev_gc_assignment) that.prev_gc_assignment.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($("#delete-gc-assignments-from-class-template").html());
            }
            that.prev_tag = current_tag;
            that.prev_gc_assignment = assignment_container;
        }

        if (priority_data.status_value === Priority.INCOMPLETE_WORKS) {
            if (!that.already_found_first_incomplete_works) {
                assignment_container.addClass("first-add-line-wrapper");
                $("#autofill-work-done").insertBefore(dom_assignment);
                that.already_found_first_incomplete_works = true;
            }
            that.prev_incomplete_works_assignment = assignment_container;
        }
        if (priority_data.status_value === Priority.COMPLETELY_FINISHED) {
            if (!that.already_found_first_finished) {
                assignment_container.addClass("first-add-line-wrapper");
                $("#delete-starred-assignments").insertBefore(dom_assignment);
                that.already_found_first_finished = true;
            }
            that.prev_finished_assignment = assignment_container;
        }
    }
    updateInfoHeader() {
        const that = this;
        if (!that.total_completion_time) {
            $("#estimated-total-time, #estimated-completion-time, #tomorrow-time").removeClass("hide-info");
            $("#estimated-completion-time, #tomorrow-time, #hide-button, #estimated-total-time-label").hide();
            $("#estimated-total-time").text(dat.length ? 'You have finished everything for today' : 'You don\'t have any assignments');
        } else {
            $("#hide-button").text() === "Show" && $("#estimated-total-time, #estimated-completion-time, #tomorrow-time").addClass("hide-info");
            $("#estimated-completion-time, #tomorrow-time, #hide-button, #estimated-total-time-label").show();
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
        if (!that.params.first_sort)
            $("#currently-has-changed-notice").remove();
        utils.ui.tickClock();
    }
    sort(params={first_sort: false, autofill_all_work_done: false, autofill_no_work_done: false, dont_swap: false}) {
        // can still be called from the tags or the end of transitionDeleteAssignment
        if (VIEWING_DELETED_ASSIGNMENTS) return;

        this.params = params;
        if (Priority.is_currently_sorting) {
            Priority.recurse_params = this.params;
        } else {
            Priority.is_currently_sorting = true;
            this.sortWithoutTimeout();
            if (Priority.recurse_params) {
                Priority.recurse_params = undefined;
                Priority.is_currently_sorting = false;
                this.sort(Priority.recurse_params);
            } else {
                Priority.is_currently_sorting = false;
            }
        }
    }
    sortWithoutTimeout() {
        const that = this;
        that.updateAssignmentHeaderMessagesAndSetPriorityData();
        that.alertDueDates();
        
        // Updates open graphs' today line and other graph text
        $(window).trigger("redrawGraphs");
        that.priority_data_list.sort((a, b) => that.assignmentSortingComparator(a, b));
        // /* Source code lurkers, uncomment this for some fun */function shuffleArray(array) {for (var i = array.length - 1; i > 0; i--) {var j = Math.floor(Math.random() * (i + 1));var temp = array[i];array[i] = array[j];array[j] = temp;}};shuffleArray(that.priority_data_list);
        that.highest_priority = Math.max(...that.priority_data_list.map(function(priority_data) {
            if ([Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY].includes(priority_data.status_value)) {
                return priority_data.status_priority;
            } else {
                return -Infinity;
            }
        }));
        let first_available_tutorial_assignment_fallback;
        let first_available_tutorial_assignment;
        $("#autofill-work-done, #delete-starred-assignments").each(function() {
            if ($(this).parent().is(".assignment-container"))
                $(this).insertBefore($(this).parent());
        });
        $(".delete-gc-assignments-from-class").remove();
        $(".first-add-line-wrapper, .last-add-line-wrapper").removeClass("first-add-line-wrapper last-add-line-wrapper");
        for (let [index, priority_data] of that.priority_data_list.entries()) {
            const dom_assignment = $(".assignment").eq(priority_data.index);
            const assignment_container = dom_assignment.parents(".assignment-container");

            if (!first_available_tutorial_assignment_fallback) {
                first_available_tutorial_assignment_fallback = dom_assignment;
            }

            let priority_percentage = that.priorityDataToPriorityPercentage(priority_data);
            const add_priority_percentage = SETTINGS.show_priority && [Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY].includes(priority_data.status_value);
            const dom_title = $(".title").eq(priority_data.index);
            dom_title.attr("data-priority", add_priority_percentage ? `Priority: ${priority_percentage}%` : "");

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
		                        let scrollTimeout = setTimeout(resolve, 200);
		                        $("#assignments-container").scroll(() => {
									if (assignment_container.is("#animate-in"))
										$("#extra-navs").hide();
                                    clearTimeout(scrollTimeout);
                                    scrollTimeout = setTimeout(resolve, 200);
                                });
							}, 0);
						}, 0);
                    });
                }).then(function() {
                    $("#assignments-container").off('scroll');
                    that.colorOrAnimateInAssignment({
                        dom_assignment,
                        is_element_submitted: true,
                        priority_percentage,
                        first_sort: that.params.first_sort,
                    });
                });
            } else {
                that.colorOrAnimateInAssignment({
                    dom_assignment,
                    is_element_submitted: false,
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
        that.prev_gc_assignment?.addClass("last-add-line-wrapper");
        that.prev_finished_assignment?.addClass("last-add-line-wrapper");
        that.prev_incomplete_works_assignment?.addClass("last-add-line-wrapper");

        // wrappers that wrap only around one assignment
        $(".assignment-container.first-add-line-wrapper.last-add-line-wrapper").each(function() {
            // Don't apply this removal to #autofill-work-done
            if ($(this).find("#autofill-work-done").length) return;

            // Remove #delete-starred-assignments and every other shortcut
            $(this).removeClass("first-add-line-wrapper last-add-line-wrapper add-line-wrapper");
            $(this).find("#delete-starred-assignments").insertBefore($(this));
            $(this).find(".shortcut").remove();
        });

        if (!first_available_tutorial_assignment) {
            first_available_tutorial_assignment = first_available_tutorial_assignment_fallback;
        }
        utils.ui.insertTutorialMessages(first_available_tutorial_assignment);

        if (!that.params.dont_swap) {
            if (!that.params.first_sort && $(".assignment-container").length <= SETTINGS.sorting_animation_threshold)
                $(".assignment-container").each(function() {
                    that.setInitialAssignmentTopOffset($(this));
                });
            that.domSortAssignments(that.priority_data_list);

            if (!that.params.first_sort && $(".assignment-container").length <= SETTINGS.sorting_animation_threshold)
                $(".assignment-container").each(function() {
                    const assignment_container = $(this);
                    that.transitionSwap(assignment_container);
                });
        }

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
                    top: Math.max(
                        // ensure assignments don't scroll from the top of the screen
                        // the below min parameter sets the assignment to the very bottom of your screen,
                        // no matter what
                        // this ensures that if the assignment is downwards from your scroll position,
                        // it won't be at the bottom of your screen and instead at the bottom
                        // of your assignments
                        Priority.ANIMATE_IN_START_MARGIN,
                        Math.min(
                            // ensure assignments don't scroll from the bottom to the top too far
                            window.innerHeight,
                            $(".assignment-container:last").offset().top + $(".assignment-container:last").height() + Priority.ANIMATE_IN_START_MARGIN
                        // subtract the offset top to get the actual top value
                        // eg if we want this to be at 500px from the top of the screen, subtract its existing
                        // offset top and make that number its new top
                        ) - $("#animate-in").offset().top
                    ),
                    marginBottom: -$("#animate-in").outerHeight(),
                });
            });
        }
		that.updateInfoHeader();
        if (that.params.first_sort) {
            let assignment_header = $("#assignments-header");
            if (assignment_header.position().top !== 0) {
                assignment_header.insertBefore(assignment_header.parent()).prependTo(assignment_header.next());
                console.log("fixed");
            }
            let assignment_container = $(".assignment-container:first");
            if (assignment_container.position().top !== assignment_header.outerHeight()) {
                assignment_container.insertBefore(assignment_container.parent()).prependTo(assignment_container.next());
                console.log("fixed");
                console.log($(".assignment-container"));
            }
        }
        $("#assignments-container").css("opacity", "1");
        
    }
}
document.addEventListener("DOMContentLoaded", function() {
	if (VIEWING_DELETED_ASSIGNMENTS) {
		const complete_date_now = utils.getRawDateNow();
		$(".assignment").each(function() {
            let deletion_time = new Assignment($(this)).sa.deletion_time;
            let str_daysleft = `Deleted ${utils.formatting.formatSeconds((complete_date_now - deletion_time) / 1000)} ago`;

            if (complete_date_now.getFullYear() === deletion_time.getFullYear()) {
                var long_str_daysleft = deletion_time.toLocaleDateString([], {month: 'long', day: 'numeric'});
            } else {
                var long_str_daysleft = deletion_time.toLocaleDateString([], {year: 'numeric', month: 'long', day: 'numeric'});
            }
            long_str_daysleft = `Deleted ${long_str_daysleft}`;
			const dom_title = $(this).find(".title");
			dom_title.attr("data-daysleft", str_daysleft);
			dom_title.attr("data-long-daysleft", long_str_daysleft);
		});
		$("#assignments-container").css("opacity", "1");
	} else {
		new Priority().sort({ first_sort: true });
	}
    function positionTags() {
        $(".assignment").each(function() {
            new VisualAssignment($(this)).positionTags();
        });
        if ("scroll" in sessionStorage) {
            $("#assignments-container").scrollTop(sessionStorage.getItem("scroll"));
        }
    }
    if (SETTINGS.horizontal_tag_position === "Left") {
        // "Left" is mega slow, do it after
        $(window).one("load", positionTags);
    } else {
        positionTags();
    }
});