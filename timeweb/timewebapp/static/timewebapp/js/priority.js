// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Priority {
    static ANIMATE_IN_DURATION = 1500 * SETTINGS.animation_speed;
    static SWAP_TRANSITION_DELAY_FUNCTION = transform_value => (1.75 + Math.abs(transform_value) / 2000) * SETTINGS.animation_speed;
    static ANIMATE_IN_START_MARGIN = 120; // Moves #animate-in a bit below the last assignment to give it more breathing room
    static TOO_MUCH_TO_AUTOFILL_CUTOFF = 100;
    
    static DUE_DATE_PASSED = 12;
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
        that.due_date_incremented_notices = [];
        that.priority_data_list = [];
        that.total_completion_time = 0;
        that.today_total_completion_time = 0;
        that.tomorrow_total_completion_time = 0;
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
    // https://www.desmos.com/calculator/nhivlbqdzf
    // I will not be explaining anything nor answering any questions
    // goodbye
    static dayZeroScaleOutput = 4.2;
    static dueDateTransitionValue = 1.8;
    static piecewiseCutoff = 3.9;
    static dueDateScalingFunction(days_until_due) {
        const x = days_until_due;
        const a = Priority.dayZeroScaleOutput;
        const b = Priority.dueDateTransitionValue;
        const c = Priority.piecewiseCutoff;
        assert(x > 0);
        if (x <= c)
            return x / (a - a * x * x / (c * c) + x * x / (c * c - b * c));
        return x - b;
    }
    static todoScalingFunction(minutes) {
        return Math.sqrt(minutes);
    }
    // complete_date_now isn't actually needed, just so we don't need to call new Date() again
    static generateDaysleftMessages(sa, complete_date_now, hard_due_date_passed) {
        const that = this;
        let str_daysleft;
        let long_str_daysleft;
        let mobile_str_daysleft;
        let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
        if (today_minus_assignment_date < 0) {
            if (today_minus_assignment_date === -1) {
                str_daysleft = 'Assigned Tomorrow';
            } else if (today_minus_assignment_date > -7) {
                str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString([], {weekday: 'long'})}`;
                mobile_str_daysleft = `Assigned ${sa.sa.assignment_date.toLocaleDateString([], {weekday: 'long'})}`;
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
                        if (hard_due_date_passed)
                            str_daysleft = 'Earlier Today';
                        else
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
                let len_works = sa.sa.works.length - 1;
                const complete_due_date = new Date(sa.sa.assignment_date.valueOf());
                complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.sa.complete_x));
                if (sa.sa.due_time && (sa.sa.due_time.hour || sa.sa.due_time.minute)) {
                    complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.sa.due_time.hour * 60 + sa.sa.due_time.minute);
                }
                // NOTE: due_date_minus_today > 0 and complete_due_date <= complete_date_now might be redundant but idc
                const incomplete_past_inputs = today_minus_assignment_date > len_works + sa.sa.blue_line_start || complete_due_date <= complete_date_now && sa.sa.soft;
                const reached_end_of_assignment = len_works + sa.sa.blue_line_start === sa.sa.x;
                if (Number.isFinite(sa.sa.y) && due_date_minus_today > 0 && !incomplete_past_inputs && !reached_end_of_assignment && SETTINGS.display_working_days_left) { 
                    // due_date_minus_today floors the due time, so let's also do this on the work days left for consistency
                    // we do this because it doesn't make logical sense to say an assignment is due in 2 days when it is due in 25 hours

                    // It technically makes more sense to use reference "today", but let's try to instead use "blue line end" for consistency
                    // If today is before blue line end, this.funct before blue_line_end is always constant, so there is no difference in the diffcheck
                    // If today is equal to blue line end, they have the same reference starting location and the diffcheck is by definition the same
                    // If today is after blue line end, this wont even be ran
                    const remaining_work_days = sa.getWorkingDaysRemaining({ reference: "blue line end", floor_due_time: true, diffcheck: true });
                    // NaN is returned if due_date_minus_today is negative. Let's check if it's greater than 0 for readability
                    if (remaining_work_days >= 0)
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
        if (!mobile_str_daysleft)
            mobile_str_daysleft = str_daysleft;
        return {str_daysleft, long_str_daysleft, mobile_str_daysleft};
    }
    static generate_UNFINISHED_FOR_TODAY_status_message(sa, todo, last_work_input, reference_relative_date=false) {
        if (todo + last_work_input === sa.sa.y) {
            return "Finish this assignment" + (reference_relative_date ? " today" : "");
        } else if (sa.unit_is_of_time) {
            const todo_minutes = Crud.safeConversion(todo, sa.sa.time_per_unit);
            return `Complete ${utils.formatting.formatMinutes(todo_minutes, true)} of work`;
        } else {
            return `Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit, todo).toLowerCase()}`;
        }
    }
    // create a sorting function that compares numbers on the number line for less than [0, 1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5]
    static dueDateCompareLessThan(a, b) {
        if (a === b || a === undefined || b === undefined) {
            return false;
        } else if (a >= 0 && b >= 0) {
            return a < b;
        } else if (a < 0 && b < 0) {
            return a > b;
        } else {
            return a >= 0;
        }
    }
    static dueDateCompareGreaterThan(a, b) {
        if (a === b || a === undefined || b === undefined) {
            return false;
        } else if (a >= 0 && b >= 0) {
            return a > b;
        } else if (a < 0 && b < 0) {
            return a < b;
        } else {
            return a < 0;
        }
    }
    updateAssignmentHeaderMessagesAndSetPriorityData() {
        const that = this;
        const complete_date_now = utils.getRawDateNow();
        const starred_assignment_ids_to_delete_after_sorting = new Set();
        if (that.params.autofill_all_work_done) {
            that.params.autofill_all_work_done = that.params.autofill_all_work_done.toArray();
        } else {
            that.params.autofill_all_work_done = [];
        }
        if (that.params.autofill_no_work_done) {
            that.params.autofill_no_work_done = that.params.autofill_no_work_done.toArray();
        } else {
            that.params.autofill_no_work_done = [];
        }
        if (SETTINGS.enable_tutorial) {
            that.assignments_to_sort = $("#animate-in");
            $(".assignment-container").not(that.assignments_to_sort).hide();
        } else {
            that.assignments_to_sort = $(".assignment-container");
            that.assignments_to_sort.show();
        }
        that.assignments_to_sort.each(function(index) {
            const assignment_container = $(this);
            const dom_assignment = assignment_container.children(".assignment");
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
            if (that.params.first_sort && !sa.sa.needs_more_info && !sa.sa.fixed_mode && dom_assignment.hasClass("refresh-dynamic-mode")) {
                // Fix dynamic start if y or anything else was changed
                // setParabolaValues needs to be above for it doesn't run in this function with fixed mode
                sa.refreshDynamicMode({ shouldAutotuneParams: { skip_break_days_check: true } });
            }

            let delete_starred_assignment_after_sorting = false;
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
            let todo = sa.funct(len_works + sa.sa.blue_line_start + 1) - last_work_input;
            const dom_status_image = dom_assignment.find(".status-image");
            const dom_status_message = dom_assignment.find(".status-message");
            const dom_title = dom_assignment.find(".title");
            const dom_completion_time = dom_assignment.find(".completion-time");
            const dom_tags = dom_assignment.find(".tags");

            let first_real_tag = sa.sa.tags[0];
            for (let tag_index_iterator = 1; ["Important","Not Important"].includes(first_real_tag); tag_index_iterator++) {
                first_real_tag = sa.sa.tags[tag_index_iterator];
            }
            if (first_real_tag)
                first_real_tag = first_real_tag.toLowerCase();
            
            if (sa.sa.tags.includes("Important")) {
                var has_important_tag = true;
            }
            if (sa.sa.tags.includes("Not Important")) {
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
            if (!sa.sa.needs_more_info && that.params.autofill_all_work_done.includes(dom_assignment[0]) && number_of_forgotten_days > 0) {
                let has_autofilled = false;
                for (let i = 0; i < number_of_forgotten_days; i++) {
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                    // Don't use "sa.sa.soft" logic because this will always complete the assignment if the due date already passed
                    if (len_works + sa.sa.blue_line_start === sa.sa.x) break; // Don't autofill past completion
                    has_autofilled = true;
                    last_work_input += Math.max(0, todo);
                    sa.sa.works.push(last_work_input);
                    len_works++;
                    // no need to set dynamic start or autotune skew ratio because it doesn't happen if input === todo (graph.js)
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
            } else if (finished_work_inputs) {
                status_value = Priority.COMPLETELY_FINISHED;
                status_image = "completely_finished";
                status_message = 'You\'re completely finished with this assignment';
                //hard
                dom_status_image.attr({
                    width: 19,
                    height: 19,
                }).css({marginTop: -2, marginLeft: -1, marginRight: -2});
                // finished_work_inputs to ensure that assignments are only deleted when the user is aware
                if (SETTINGS.immediately_delete_completely_finished_assignments && !sa.sa.dont_hide_again)
                    delete_starred_assignment_after_sorting = true;
            } else if (not_yet_assigned) {
                status_image = "not_yet_assigned";
                status_message = 'This assignment hasn\'t yet been assigned';
                status_value = Priority.NOT_YET_ASSIGNED;
                //hard
                dom_status_image.attr({
                    width: 15,
                    height: 15,
                }).css({marginLeft: -1, marginRight: -1});
            } else {
                let has_autofilled = false;
                if (that.params.autofill_no_work_done.includes(dom_assignment[0]) && number_of_forgotten_days > 0) {
                    let iter = 0;
                    for (let i = 0; i < number_of_forgotten_days; i++) {
                        if (!sa.sa.soft && len_works + sa.sa.blue_line_start === sa.sa.x) break;

                        todo = sa.funct(len_works + sa.sa.blue_line_start + 1) - last_work_input;
                        has_autofilled = true;
                        sa.sa.works.push(last_work_input);
                        len_works++;
                        // theres a small chance that we dont actually need to run setDynamicStart
                        // if shouldAutotune is false, but its more forward compatible to just run it anyways
                        if (todo !== 0 && !sa.sa.fixed_mode && iter < Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) {
                            sa.refreshDynamicMode({ shouldAutotuneParams: { extra_conditions: [number_of_forgotten_days < Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF] }});
                            iter++;
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
                    // If the user edits their due date before their last work input and there is a work input on x,
                    // don't increment the due date over here

                    // This is for the sake of being consistent; due time only changes 
                    // Plus it would be extremely jarring to the user to have an alert immediately after creating an 
                    // assignment and seeing a due date different from what they entered
                    const increment_due_date_condition = sa.sa.soft && today_minus_assignment_date >= sa.sa.x;
                    if (increment_due_date_condition) {
                        sa.sa.x = today_minus_assignment_date;
                        sa.incrementDueDate();
                        complete_due_date = new Date(sa.sa.assignment_date.valueOf());
                        complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.sa.complete_x));
                        if (sa.sa.due_time && (sa.sa.due_time.hour || sa.sa.due_time.minute)) {
                            complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.sa.due_time.hour * 60 + sa.sa.due_time.minute);
                        }
                        // don't autotune here because x1 is 1
                        sa.setDynamicStart();
                    }

                    if (has_autofilled && (number_of_forgotten_days >= Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF || iter >= Priority.TOO_MUCH_TO_AUTOFILL_CUTOFF) && !sa.sa.fixed_mode) {
                        // { skip_break_days_check: true } because this can be thought of as refreshing dynamic mode
                        sa.refreshDynamicMode({ shouldAutotuneParams: { skip_break_days_check: true }});
                    }

                    if (has_autofilled) {
                        ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {works: sa.sa.works.map(String), id: sa.sa.id});
                        todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                    }
                }
                const todo_is_completed = todo <= 0;
                const current_work_input_is_break_day = sa.sa.break_days.includes((sa.assign_day_of_week + today_minus_assignment_date) % 7);
                const already_entered_work_input_for_today = today_minus_assignment_date < len_works + sa.sa.blue_line_start;
                const incomplete_past_inputs = today_minus_assignment_date > len_works + sa.sa.blue_line_start || complete_due_date <= complete_date_now && sa.sa.soft;
                // Don't mark as no working days when the end of the assignment has been reached
                const no_working_days = sa.getWorkingDaysRemaining({ reference: "blue line end" }) === 0 && len_works + sa.sa.blue_line_start !== sa.sa.x;
                if (!hard_due_date_passed && (incomplete_past_inputs || no_working_days)) {
                    status_image = 'question_mark';
                    if (incomplete_past_inputs) {
                        status_message = "Please enter your past work inputs";
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
                } else if (!hard_due_date_passed && (todo_is_completed || already_entered_work_input_for_today || current_work_input_is_break_day)) {
                    status_value = Priority.FINISHED_FOR_TODAY;
                    status_image = 'finished';
                    // although tiny, this space optimization can save an enture line
                    if (current_work_input_is_break_day) {
                        status_message = 'Today is a break day for this assignment';
                    } else {
                        // we need to mention today or this can be interpreted as completely finished
                        status_message = 'You\'re finished with this assignment\'s <span class="show-on-mobile">daily work</span><span class="hide-on-mobile">work for today</span>';
                    }
                    //hard
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css({marginLeft: -1, marginRight: -1});
                } else {
                    status_image = 'unfinished';
                    //hard
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css({marginLeft: -1, marginRight: -1});
                    if (hard_due_date_passed) {
                        todo = sa.sa.y - last_work_input;
                        var todo_minutes = Crud.safeConversion(todo, sa.sa.time_per_unit);
                        // NOTE: in case I add other status groups, it's important that I don't forget to manually add
                        // conditions to replicate as if the assignment has other status groups. This is because the
                        // condition !hard_due_date_passed manually skips over status groups that are used for checking
                        // in later behavior
                        status_value = Priority.DUE_DATE_PASSED;
                        if (sa.sa.needs_more_info)
                            status_message = "This assignment needs more info but passed its due date";
                        else
                            status_message = 'This assignment\'s due date has passed';
                    } else {
                        var todo_minutes = Crud.safeConversion(todo, sa.sa.time_per_unit);
                        that.total_completion_time += todo_minutes;
                        const due_date_minus_today_floor = Math.floor(sa.sa.complete_x) - today_minus_assignment_date;
                        if (![0, 1].includes(due_date_minus_today_floor)) {
                            status_value = Priority.UNFINISHED_FOR_TODAY;
                        } else if (due_date_minus_today_floor === 0) {
                            // we don't want a question mark and etc assignment due tomorrow toggle the tomorrow or today completion time
                            // when it in fact displays no useful information
                            that.today_total_completion_time += todo_minutes;
                            status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY;
                        } else if (due_date_minus_today_floor === 1) {
                            that.tomorrow_total_completion_time += todo_minutes;
                            if (sa.sa.due_time && sa.sa.due_time.hour === 23 && sa.sa.due_time.minute === 59) {
                                status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW;
                            } else {
                                status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW;
                            }
                        }
                        status_message = Priority.generate_UNFINISHED_FOR_TODAY_status_message(sa, todo, last_work_input);
                    }
                }
            }

            if (status_value !== Priority.COMPLETELY_FINISHED && sa.sa.dont_hide_again) {
                sa.sa.dont_hide_again = false;
                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {dont_hide_again: sa.sa.dont_hide_again, id: sa.sa.id});
            }

            if (sa.sa.alert_due_date_incremented) {
                that.due_date_incremented_notices.push(sa.sa);
            }

            let {str_daysleft, long_str_daysleft, mobile_str_daysleft} = Priority.generateDaysleftMessages(sa, complete_date_now, hard_due_date_passed);
            dom_title.attr("data-daysleft", str_daysleft);
            dom_title.attr("data-long-daysleft", long_str_daysleft);
            dom_title.attr("data-mobile-daysleft", mobile_str_daysleft);
            
            const already_entered_work_input_for_today = today_minus_assignment_date < len_works + sa.sa.blue_line_start; // Can't just define this once because len_works changes
            const assignment_header_button = assignment_container.find(".assignment-header-button");
            const assignment_header_tick_svg = assignment_header_button.find(".tick-button");
            assignment_header_tick_svg.parents(".assignment-header-button").toggle(!(
                [
                    Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT,
                    Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG,
                    Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NOT_YET_ASSIGNED,
                    Priority.FINISHED_FOR_TODAY,
                    Priority.COMPLETELY_FINISHED,
                ].includes(status_value)
                || already_entered_work_input_for_today
                || sa.sa.needs_more_info
            ));
            let href = `#tick-svg`;
            assignment_header_tick_svg.find("use").attr("href", href);
            assignment_header_tick_svg.attr("viewBox", $(href).next().text());
            
            if (delete_starred_assignment_after_sorting && !assignment_container.hasClass("delete-this-starred-assignment")) {
                starred_assignment_ids_to_delete_after_sorting.add(sa.sa.id);
            }
            assignment_container.toggleClass("add-line-wrapper", [
                Priority.COMPLETELY_FINISHED,
                Priority.INCOMPLETE_WORKS,
                Priority.DUE_DATE_PASSED
            ].includes(status_value))
            .toggleClass("delete-this-starred-assignment", delete_starred_assignment_after_sorting);

            let status_priority; // Don't use NaN because NaN === NaN is false for calculations used later
            let todays_work;
            switch (status_value) {
                case Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY:
                case Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW:
                case Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW:
                case Priority.UNFINISHED_FOR_TODAY:
                case Priority.DUE_DATE_PASSED:
                    todays_work = sa.sa.time_per_unit * todo;
                case Priority.INCOMPLETE_WORKS:
                case Priority.NO_WORKING_DAYS:
                case Priority.FINISHED_FOR_TODAY:
                    // If due times are enabled, it's possible for (sa.sa.complete_x - (sa.sa.blue_line_start - len_works)) to become negative
                    // However this doesn't happen because the assignment will have been marked have completed in this scenario
                    status_priority = Priority.todoScalingFunction(sa.sa.time_per_unit * todo) / Priority.dueDateScalingFunction(sa.sa.complete_x - (sa.sa.blue_line_start + len_works));
                    break;
            }

            // due_date_minus_today can be NaN sometimes and break the logic in assignmentSortingComparator
            if (Number.isFinite(sa.sa.complete_x - today_minus_assignment_date))
                // define this at the very end in case incrementDueDate is called
                due_date_minus_today = sa.sa.complete_x - today_minus_assignment_date;
            const priority_data = {
                status_value,
                status_priority,
                first_real_tag,
                has_important_tag,
                has_not_important_tag,
                due_date_minus_today,
                name: sa.sa.name.toLowerCase(),
                index,
                todays_work,
                today_minus_assignment_date,
            }
            that.priority_data_list.push(priority_data);

            if (status_image) {
                dom_status_image.show();
                let href = `#${status_image}-svg`;
                dom_status_image.find("use").attr("href", href);
                dom_status_image.attr("viewBox", $(href).next().text());
            } else {
                dom_status_image.hide();
                dom_status_image.find("use").removeAttr("href");
            }
            dom_status_message.html(status_message); // use .html() instead of .text() so that .unfinished-message is parsed as an HTML element
            // Even though this is always true, it'll add this here for compatibility

            // !! is needed because toggleClass only works with booleans
            dom_tags.toggleClass("assignment-has-daysleft", SETTINGS.vertical_tag_position === "Bottom" && SETTINGS.horizontal_tag_position === "Left" && !!str_daysleft);
            switch (status_value) {
                case Priority.DUE_DATE_PASSED:
                    if (!Number.isFinite(sa.sa.y) || !Number.isFinite(last_work_input)) {
                        dom_completion_time.text("");
                        break;
                    }
                case Priority.UNFINISHED_FOR_TODAY:
                case Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY:
                case Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW:
                case Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW:
                    dom_completion_time.text(utils.formatting.formatMinutes(todo_minutes));
                    break;
                default:
                    dom_completion_time.text("");
            }
            // If the status message is "finish this assignment", display the completion time on mobile
            dom_completion_time.toggleClass("hide-on-mobile", !!sa.unit_is_of_time && todo + last_work_input !== sa.sa.y);
        });
        if (!starred_assignment_ids_to_delete_after_sorting.size) return;

        const success = function() {
            new Crud().transitionDeleteAssignment($(".assignment-container.delete-this-starred-assignment > .assignment"));
        }
        $.ajax({
            type: "POST",
            url: "/api/delete-assignment",
            data: {assignments: JSON.stringify([...starred_assignment_ids_to_delete_after_sorting])},
            success: success,
            error: ajaxUtils.error,
        });
    }
    doAssignmentAlerts() {
        const that = this;
        if (!(that.due_date_incremented_notices.length === 0 || Priority.due_date_incremented_notice_on_screen || !SETTINGS.should_alert_due_date_incremented)) {
            let due_date_incremented_notice_title;
            let due_date_incremented_notice_content;
            if (that.due_date_incremented_notices.length === 1) {
                due_date_incremented_notice_title = `Notice: "${that.due_date_incremented_notices[0].name}" has had its due date incremented because it has soft due dates enabled.`;
            } else if (that.due_date_incremented_notices.length > 1) {
                due_date_incremented_notice_title = `Notice: ${utils.formatting.arrayToEnglish(that.due_date_incremented_notices.map(i => i.name))} have had their due dates incremented because they each have soft due dates enabled.`;
            }
            due_date_incremented_notice_content = "Soft due dates increment when an assignment's due date passes but is still unfinished. If you don't want this to happen, disable soft due dates in the edit assignment form.";
            Priority.due_date_incremented_notice_on_screen = true;
            $.alert({
                title: due_date_incremented_notice_title,
                content: due_date_incremented_notice_content,
                backgroundDismiss: false,
                buttons: {
                    "Don't show again": {
                        action: function() {
                            SETTINGS.should_alert_due_date_incremented = false;
                            ajaxUtils.changeSetting({setting: "should_alert_due_date_incremented", value: SETTINGS.should_alert_due_date_incremented});
                            this.buttons.ok.action();
                        }
                    },
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

        const completely_finished = that.priority_data_list.filter(priority_data => priority_data.status_value === Priority.COMPLETELY_FINISHED);
        if (completely_finished.length > 5) {
            $.alert({
                title: "You have too many completely finished assignments.",
                content: "Delete them to improve performance and reduce clutter. Note that you can also view and restore deleted assignments in the settings.",
                backgroundDismiss: false,
                buttons: {
                    "Make this automatic": {
                        action: function() {
                            this.buttons["Delete assignments"].action(function() {
                                // do this after /api/delete-assignment or this may run while the database is locked and crash
                                SETTINGS.immediately_delete_completely_finished_assignments = true;
                                ajaxUtils.changeSetting({setting: "immediately_delete_completely_finished_assignments", value: SETTINGS.immediately_delete_completely_finished_assignments});
                            });
                        }
                    },
                    "Delete assignments": {
                        action: function(extra_success_function) {
                            const assignments_to_delete = $(completely_finished.map(priority_data => {
                                const assignment_container = that.assignments_to_sort.eq(priority_data.index);
                                const dom_assignment = assignment_container.children(".assignment");
                                return dom_assignment[0];
                            }));
                            const assignment_ids_to_delete = assignments_to_delete.map(function() {
                                const dom_assignment = $(this);
                                const sa = utils.loadAssignmentData(dom_assignment);
                                return sa.id;
                            }).toArray();
                            const success = function() {
                                new Crud().transitionDeleteAssignment(assignments_to_delete);
                                extra_success_function?.();
                            }
                            $.ajax({
                                type: "POST",
                                url: "/api/delete-assignment",
                                data: {assignments: JSON.stringify(assignment_ids_to_delete)},
                                success: success,
                                error: ajaxUtils.error,
                            });
                        }
                    },
                },
            });
        }
    }
    assignmentSortingComparator(a, b, initial_monotonic_sort) {
        const that = this;

        switch (SETTINGS.assignment_sorting) {
            // These assignment sortings are sorted *before* status value,
            // causing assignments due tomorrow to be not be at the top
            // Each setting has a justification for why it is sorted before

            // We do not need to worry about different status groups here
            // when sorting alphabetically you are not sorting by priority
            // so if stuff is due tomorrow or today i guess its fine
            case "Tag Name A-Z":
                // a.first_real_tag === undefined: Treat undefined as "a"

                // "r" > "a" => true
                // "r" > undefined => false (the below makes this true)

                // "a" < "r" => true
                // undefined < "r" => false (the below makes this true)

                // b.first_real_tag !== undefined: If both are undefined, skip this check
                if (a.first_real_tag > b.first_real_tag || b.first_real_tag === undefined && a.first_real_tag !== undefined) return 1;
                if (a.first_real_tag < b.first_real_tag || a.first_real_tag === undefined && b.first_real_tag !== undefined) return -1;
                break;
            // We do not need to worry about different status groups here
            // when sorting alphabetically you are not sorting by priority
            // so if stuff is due tomorrow or today i guess its fine
            case "Tag Name Z-A":
                // b.first_real_tag === undefined: Treat undefined as "z"

                // "r" < "z" => true
                // "r" < undefined => false (the below makes this true)
                
                // "z" > "r" => true
                // undefined > "r" => false (the below makes this true)
                
                // a.first_real_tag !== undefined: If both are undefined, skip this check
                if (a.first_real_tag < b.first_real_tag || a.first_real_tag === undefined && b.first_real_tag !== undefined) return 1;
                if (a.first_real_tag > b.first_real_tag || b.first_real_tag === undefined && a.first_real_tag !== undefined) return -1;
                break;
        }
        
        let a_status_value = a.status_value;
        let b_status_value = b.status_value;
        // +Ignore tags if its a google classroom assignment and it needs more info because important and not important can mess up some ordering
        // -Not needed anymore because of Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG
        // if (!(sa.sa.is_google_classroom_assignment && sa.sa.needs_more_info)) {
        if (!initial_monotonic_sort) {
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
        }
        // }

        // Max to min
        if (a_status_value < b_status_value) return 1;
        if (a_status_value > b_status_value) return -1;

        // a.status_value and b.status_value must be equal at this point, so define a shared variable for readability
        let status_value = a.status_value;

        switch (status_value) {
            case Priority.UNFINISHED_FOR_TODAY:
            case Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW:
            case Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW:
            case Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY:
            case Priority.INCOMPLETE_WORKS:
            case Priority.NO_WORKING_DAYS:
            case Priority.FINISHED_FOR_TODAY:
                switch (SETTINGS.assignment_sorting) {
                    // For both todays_work and status_priority,
                    // there will never be a case where one will
                    // be undefined and another will not be undefined,
                    // as the status values are the same at this point
                    case "Most Work Today First":
                        // max to min
                        if (a.todays_work > b.todays_work) return -1;
                        if (a.todays_work < b.todays_work) return 1;
                        break;
                    case "Least Work Today First":
                        // min to max
                        if (a.todays_work > b.todays_work) return 1;
                        if (a.todays_work < b.todays_work) return -1;
                        break;
                    case "Soonest Due Date First":
                        // b.due_date_minus_today === undefined: Treat undefined as positive infinity
        
                        // 5 < 10 => true
                        // 5 < undefined => false (the below makes this true)
                        
                        // 10 > 5 => true
                        // undefined > 5 => false (the below makes this true)
                        
                        // a.due_date_minus_today !== undefined: If both are undefined, skip this check
        
                        // we need a custom lt and gt comparator so we can deal with negative numbers
                        if (Priority.dueDateCompareLessThan(a.due_date_minus_today, b.due_date_minus_today) || b.due_date_minus_today === undefined && a.due_date_minus_today !== undefined) return -1;
                        if (Priority.dueDateCompareGreaterThan(a.due_date_minus_today, b.due_date_minus_today) || a.due_date_minus_today === undefined && b.due_date_minus_today !== undefined) return 1;
                        break;
                }
                switch (SETTINGS.assignment_sorting) {
                    case "Least Priority First":
                        // min to max
                        if (a.status_priority > b.status_priority) return 1;
                        if (a.status_priority < b.status_priority) return -1;
                        break;
                    default:
                        // max to min (every other case)
                        if (a.status_priority > b.status_priority) return -1;
                        if (a.status_priority < b.status_priority) return 1;
                }
                break;
            case Priority.DUE_DATE_PASSED:
                if (Priority.dueDateCompareLessThan(a.due_date_minus_today, b.due_date_minus_today) || b.due_date_minus_today === undefined && a.due_date_minus_today !== undefined) return 1;
                if (Priority.dueDateCompareGreaterThan(a.due_date_minus_today, b.due_date_minus_today) || a.due_date_minus_today === undefined && b.due_date_minus_today !== undefined) return -1;
                break;
            case Priority.NOT_YET_ASSIGNED:
                if (a.today_minus_assignment_date > b.today_minus_assignment_date) return -1;
                if (a.today_minus_assignment_date < b.today_minus_assignment_date) return 1;
                break;
        }
        if (a.first_real_tag < b.first_real_tag || b.first_real_tag === undefined && a.first_real_tag !== undefined) return -1;
        if (a.first_real_tag > b.first_real_tag || a.first_real_tag === undefined && b.first_real_tag !== undefined) return 1;

        if ([
            Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT,
            Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG,
            Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT,
            Priority.COMPLETELY_FINISHED,
        ].includes(status_value)) {
            // exact same logic as above
            // as a note, this will never deal with negative numbers, as a negative
            // due date means the assignment was already due. so, the status value
            // will be completely_finished and this if statement won't run
            if (Priority.dueDateCompareLessThan(a.due_date_minus_today, b.due_date_minus_today) || b.due_date_minus_today === undefined && a.due_date_minus_today !== undefined) return -1;
            if (Priority.dueDateCompareGreaterThan(a.due_date_minus_today, b.due_date_minus_today) || a.due_date_minus_today === undefined && b.due_date_minus_today !== undefined) return 1;
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
        let priority_percentage;
        switch (priority_data.status_value) {
            case Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT:
            case Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG:
            case Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT:
            case Priority.NO_WORKING_DAYS:
            case Priority.INCOMPLETE_WORKS:
                priority_percentage = NaN;
                break;
            case Priority.DUE_DATE_PASSED:
                priority_percentage = 100;
                break;
            case Priority.FINISHED_FOR_TODAY:
            case Priority.NOT_YET_ASSIGNED: // needed for "This assignment has not yet been assigned" being set to color values greater than 1
            case Priority.COMPLETELY_FINISHED:
                priority_percentage = 0;
                break;
            default:
                priority_percentage = Math.max(1, Math.floor(priority_data.status_priority / that.highest_priority * 100 + 1e-10));
                if (!Number.isFinite(priority_percentage)) {
                    priority_percentage = 100;
                }
        }
        return priority_percentage;
    }
    addAssignmentShortcut(dom_assignment, priority_data) {
        const that = this;
        // Loops through every google classroom assignment that needs more info AND has a tag (representing their class) to add "delete assignments of this class"
        // Uses the same below logic for delete starred assignments and autoill work done

        // This has to be looped before they are sorted so setInitialAssignmentTopOffset is accurate
        // This means we can't loop through ".assignment-container" because it's currently unsorted, so we instead have to loop through that.priority_data_list
        // The current looped assignment's tag is compared with the previous looped assignment's tag
        // If they are different, the previous assignment is the last assignment with its tag and the current assignment is the first assignment with its tag
        const sa = utils.loadAssignmentData(dom_assignment);
        const assignment_container = dom_assignment.parents(".assignment-container");

        var current_tag = priority_data.first_real_tag;
        if (sa.is_google_classroom_assignment && sa.needs_more_info && priority_data.status_value !== Priority.DUE_DATE_PASSED && current_tag) {
            assignment_container.addClass("add-line-wrapper");
            // We need to check that.prev_gc_assignment !== that.prev_assignment
            // This deteects if there is a break between a wrapper. If there is,
            // add the last-add-line-wrapper class to the previous assignment and
            // make the current assignment the first line wrapper
            if (that.prev_tag !== current_tag || that.prev_gc_assignment !== that.prev_assignment) { // Still works if an assignment needs more info but doesn't have a tag
                if (that.prev_gc_assignment) that.prev_gc_assignment.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($("#delete-gc-assignments-from-class-template").html());
            }
            that.prev_gc_assignment = assignment_container;
        }
        if (priority_data.status_value === Priority.INCOMPLETE_WORKS) {
            assignment_container.addClass("add-line-wrapper");
            if (that.prev_status_value !== Priority.INCOMPLETE_WORKS || that.prev_incomplete_works_assignment !== that.prev_assignment) {
                if (that.prev_incomplete_works_assignment) that.prev_incomplete_works_assignment.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($("#autofill-work-done-template").html());
            }
            that.prev_incomplete_works_assignment = assignment_container;
        }
        if (priority_data.status_value === Priority.COMPLETELY_FINISHED) {
            assignment_container.addClass("add-line-wrapper");
            if (that.prev_status_value !== Priority.COMPLETELY_FINISHED || that.prev_finished_assignment !== that.prev_assignment) {
                if (that.prev_finished_assignment) that.prev_finished_assignment.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($("#delete-starred-assignments-template").html());
            }
            that.prev_finished_assignment = assignment_container;
        }
        if (priority_data.status_value === Priority.DUE_DATE_PASSED) {
            assignment_container.addClass("add-line-wrapper");
            if (that.prev_status_value !== Priority.DUE_DATE_PASSED || that.prev_due_date_passed_assignment !== that.prev_assignment) {
                if (that.prev_due_date_passed_assignment) that.prev_due_date_passed_assignment.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($("#delete-due-date-passed-assignments-template").html());
            }
            that.prev_due_date_passed_assignment = assignment_container;
        }
        that.prev_tag = current_tag;
        that.prev_status_value = priority_data.status_value;
        that.prev_assignment = assignment_container;
    }
    updateInfoHeader() {
        const that = this;
        if (!that.total_completion_time || SETTINGS.enable_tutorial && that.params.first_sort) {
            $("#estimated-total-time, #estimated-completion-time, #important-total-time").removeClass("hide-info");
            $("#estimated-completion-time, #important-total-time, #hide-button, #estimated-total-time-label").hide();
            if (!dat.length || SETTINGS.enable_tutorial && that.params.first_sort) {
                $("#estimated-total-time").text("You don't have any assignments");
                if (SETTINGS.enable_tutorial && that.params.first_sort) {
                    $(window).one("animate-example-assignment", function() {
                        that.params.first_sort = false;
                        that.updateInfoHeader.bind(that)();
                    });
                }
            } else {
                $("#estimated-total-time").text("You have finished everything for today");
            }
        } else {
            $("#hide-button").text() === "Show" && $("#estimated-total-time, #estimated-completion-time, #important-total-time").addClass("hide-info");
            $("#estimated-completion-time, #important-total-time, #hide-button, #estimated-total-time-label").show();
            $("#estimated-total-time").text(` ${utils.formatting.formatMinutes(that.total_completion_time)}`).attr("data-minutes", that.total_completion_time);

            if (that.today_total_completion_time) {
                var relative_important_total_time_date = "Today";
                var important_total_minutes = that.today_total_completion_time;
            } else {
                var relative_important_total_time_date = "Tomorrow";
                var important_total_minutes = that.tomorrow_total_completion_time;
            }
            let important_total_time = utils.formatting.formatMinutes(important_total_minutes);
            $("#important-total-time").text(` (${important_total_time} due ${relative_important_total_time_date})`);
        }
        if (!that.params.first_sort)
            $("#currently-has-changed-notice").remove();
        utils.ui.tickClock();
    }
    static scrollBeforeAssignmentAnimation(resolvers, assignment_to_scroll_to) {
        function _resolve() {
            $("#assignments-container").off('scroll.assignmentanimation');
            resolvers.forEach(resolver => resolver?.());
        }
        const last_visual_assignment = utils.flexboxOrderQuery(".assignment-container").last();
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
                    last_visual_assignment.offset().top + last_visual_assignment.height() + Priority.ANIMATE_IN_START_MARGIN
                // subtract the offset top to get the actual top value
                // eg if we want this to be at 500px from the top of the screen, subtract its existing
                // offset top and make that number its new top
                ) - $("#animate-in").offset()?.top
            ),
            marginBottom: -$("#animate-in").outerHeight(),
        });
        assignment_to_scroll_to[0].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
        let scrollTimeout = setTimeout(_resolve, 200);
        $("#assignments-container").on("scroll.assignmentanimation", () => {
            if ($("#animate-in").length)
                $("#extra-navs").hide();
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(_resolve, 200);
        });
    }
    sortDeletedAssignmentsView() {
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
    }
    sort(params={first_sort: false, autofill_all_work_done: false, autofill_no_work_done: false, dont_swap: false}) {
        this.params = params;

        // can still be called from the tags or the end of transitionDeleteAssignment
        if (VIEWING_DELETED_ASSIGNMENTS) {
            if (this.params.first_sort) {
                this.sortDeletedAssignmentsView();
            }
            return;
        }
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
        that.doAssignmentAlerts();
        
        // Updates open graphs' today line and other graph text
        $(window).trigger("redrawGraphs");

        const old_setting = SETTINGS.assignment_sorting;
        SETTINGS.assignment_sorting = "Most Priority First";
        that.priority_data_list = that.priority_data_list.sort((a, b) => that.assignmentSortingComparator(a, b, true));
        SETTINGS.assignment_sorting = old_setting;

        // The first assignment will always be the highest priority assignment because ever other assignment is being monotonically scaled down
        that.highest_priority = that.priority_data_list.find(priority_data => [
            Priority.UNFINISHED_FOR_TODAY,
            Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW,
            Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW,
            Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY,
        ].includes(priority_data.status_value));
        if (that.highest_priority) {
            that.highest_priority = that.highest_priority.status_priority;
        } else {
            that.highest_priority = -Infinity;
        }

        function scale() {
            let old_status_priority;
            let old_status_value;
            for (let [i, priority_data] of that.priority_data_list.entries()) {
                if (![
                    // Every status group with a priority percentage
                    Priority.UNFINISHED_FOR_TODAY,
                    Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW,
                    Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW,
                    Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY
                ].includes(priority_data.status_value))
                    continue;

                let current_status_priority = priority_data.status_priority;
                let current_status_value = priority_data.status_value;
                // old_status_priority !== undefined because i can't initially define old_status_priority
                // (and set it to that.priority_data_list[0].status_priority)
                // this is because [0] may not be unfinished for today
                if (current_status_value !== old_status_value && old_status_priority !== undefined && current_status_priority > old_status_priority - that.highest_priority * 0.01) {
                    const scaling_factor = (old_status_priority - that.highest_priority * 0.01) / current_status_priority;
                    for (let j = i; j < that.priority_data_list.length; j++) {
                        that.priority_data_list[j].status_priority *= scaling_factor;
                    }
                    scale();
                    return;
                }
                old_status_priority = current_status_priority;
                old_status_value = current_status_value;
            }
        }
        scale();
        that.priority_data_list = that.priority_data_list.sort((a, b) => that.assignmentSortingComparator(a, b, false));
        // /* Source code lurkers, uncomment this for some fun */function shuffleArray(array) {for (var i = array.length - 1; i > 0; i--) {var j = Math.floor(Math.random() * (i + 1));var temp = array[i];array[i] = array[j];array[j] = temp;}};shuffleArray(that.priority_data_list);

        let first_available_tutorial_assignment_fallback;
        let first_available_tutorial_assignment;
        $(".delete-gc-assignments-from-class, .autofill-work-done, .delete-starred-assignments, .delete-due-date-passed-assignments").remove();
        $(".first-add-line-wrapper, .last-add-line-wrapper").removeClass("first-add-line-wrapper last-add-line-wrapper");
        for (let [index, priority_data] of that.priority_data_list.entries()) {
            const assignment_container = that.assignments_to_sort.eq(priority_data.index);
            const dom_assignment = assignment_container.children(".assignment");

            if (!first_available_tutorial_assignment_fallback) {
                first_available_tutorial_assignment_fallback = dom_assignment;
            }

            let priority_percentage = that.priorityDataToPriorityPercentage(priority_data);
            const add_priority_percentage = SETTINGS.show_priority && [
                Priority.UNFINISHED_FOR_TODAY,
                Priority.UNFINISHED_FOR_TODAY_AND_DUE_END_OF_TOMORROW,
                Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW,
                Priority.UNFINISHED_FOR_TODAY_AND_DUE_TODAY
            ].includes(priority_data.status_value);
            const dom_title = dom_assignment.find(".title");

            const old_add_priority_percentage = !!dom_title.attr("data-priority");
            dom_title.attr("data-priority", add_priority_percentage ? `Priority: ${priority_percentage}%` : "");
            if (old_add_priority_percentage !== add_priority_percentage && document.contains(dom_assignment[0]))
                new VisualAssignment(dom_assignment).positionTags();

            new Promise(function(resolve) {
                if (that.params.first_sort && assignment_container.is("#animate-color, #animate-in")) {
                    assignment_container.filter("#animate-in").css({
                        position: "absolute",
                        opacity: 0,
                    });
                    // Since "#animate-in" will have a bottom margin of negative its height, the next assignment will be in its final position at the start of the animation
                    // So, scroll to the next assignment instead
                    // Scroll to dom_assignment because of its scroll-margin
                    let assignment_to_scroll_to = that.assignments_to_sort.eq(that.priority_data_list[index + 1]?.index).children(".assignment");
                    if (!assignment_to_scroll_to.length || $("#animate-color").length) {
                        // If "#animate-color" exists or "#animate-in" is the last assignment on the list, scroll to itself instead
                        assignment_to_scroll_to = dom_assignment;
                    }
                    $(window).one(SETTINGS.enable_tutorial ? 'animate-example-assignment' : 'load', function(e, triggered_resolve) {
                        Priority.scrollBeforeAssignmentAnimation([resolve, triggered_resolve], assignment_to_scroll_to);
                    });
                } else {
                    resolve();
                }
            }).then(function() {
                if (assignment_container.is("#animate-in")) {
                    // Don't make this a CSS animation because margin-bottom is used a lot on .assignment-container and it's easier if it doesn't have a css transition
                    assignment_container.animate({
                        top: "0",
                        opacity: "1",
                        marginBottom: "0",
                    }, Priority.ANIMATE_IN_DURATION, "easeOutCubic", () => {$("#extra-navs").show()});
                }
                // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
                if (that.params.first_sort) {
                    dom_assignment.addClass("transition-instantly");
                }
                if (Number.isNaN(priority_percentage) || !SETTINGS.show_priority) {
                    dom_assignment.css("--priority-color", "var(--color)");
                } else {
                    const priority_color = that.percentageToColor(priority_percentage);
                    dom_assignment.css("--priority-color", `rgb(${priority_color.r}, ${priority_color.g}, ${priority_color.b})`);
                }
                if (that.params.first_sort) {
                    // Which element specifically is overflowed seems to have minimal effect on performance
                    dom_assignment[0].offsetHeight;
                    dom_assignment.removeClass("transition-instantly");
                }
            });            
            that.addAssignmentShortcut(dom_assignment, priority_data);
            if (!first_available_tutorial_assignment && ![
                    Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT,
                    Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG,
                    Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT,
                    Priority.NO_WORKING_DAYS,
                    Priority.INCOMPLETE_WORKS,
                    Priority.COMPLETELY_FINISHED,
                    Priority.DUE_DATE_PASSED,
                ].includes(priority_data.status_value) && !dom_assignment.hasClass("assignment-is-deleting")
            ) {
                first_available_tutorial_assignment = dom_assignment;
            }
        }
        // End part of addAssignmentShortcut
        that.prev_gc_assignment?.addClass("last-add-line-wrapper");
        that.prev_incomplete_works_assignment?.addClass("last-add-line-wrapper");
        that.prev_finished_assignment?.addClass("last-add-line-wrapper");
        that.prev_due_date_passed_assignment?.addClass("last-add-line-wrapper");

        // wrappers that wrap only around one assignment
        $(".assignment-container.first-add-line-wrapper.last-add-line-wrapper").each(function() {
            if ($(this).find(".allow-singular-wrapper").length) return;

            // Remove .delete-starred-assignments and every other shortcut
            $(this).removeClass("first-add-line-wrapper last-add-line-wrapper add-line-wrapper");
            $(this).find(".shortcut").remove();
        });

        if (!first_available_tutorial_assignment) {
            first_available_tutorial_assignment = first_available_tutorial_assignment_fallback;
        }
        if (SETTINGS.enable_tutorial && that.params.first_sort)
            utils.ui.tutorial(first_available_tutorial_assignment);

        // We need to do this in a separate loop so single assignment line wrappers are removed appropriately
        for (let [index, priority_data] of that.priority_data_list.entries()) {
            const assignment_container = that.assignments_to_sort.eq(priority_data.index);
            assignment_container.toggleClass("add-shortcut-margin", index === 0 && assignment_container.hasClass("add-line-wrapper"));
        }
        if (!that.params.dont_swap) {

            let tops = new Array(that.assignments_to_sort.length);
            tops.fill(undefined);
            Object.seal(tops);

            if (!that.params.first_sort && that.assignments_to_sort.length <= SETTINGS.sorting_animation_threshold)
                that.assignments_to_sort.each(function(i) {
                    tops[i] = $(this).offset().top;
                });

            for (let [index, priority_data] of that.priority_data_list.entries()) {
                that.assignments_to_sort.eq(priority_data.index).css("order", index);
            }

            if (!that.params.first_sort && that.assignments_to_sort.length <= SETTINGS.sorting_animation_threshold)
                that.assignments_to_sort.each(function(i) {
                    const assignment_container = $(this);
                    const initial_height = tops[i];
                    let current_translate_value = (assignment_container.css("transform").split(",")[5]||")").slice(0,-1); // Read the translateY value from the returned MATRIX_ENDS_WEIGHT
                    // Assignments can move while this is being executed; current_translate_value becomes old inaccurate
                    // Account for this for this execution time inconsistency by multiplying it by an eyeballed adjustment factor of 0.9
                    current_translate_value *= 0.9;
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
                });
        }
		that.updateInfoHeader();
        $("#assignments-container").css("opacity", "1");
        
    }
}
window.Priority = Priority;
document.addEventListener("DOMContentLoaded", function() {
    new Priority().sort({ first_sort: true });
    function positionTags() {
        $(".assignment").each(function() {
            const sa = new VisualAssignment($(this));
            sa.positionTags();
            sa.makeGCAnchorVisible();
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