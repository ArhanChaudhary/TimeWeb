// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Priority {
    constructor() {
        var that = this;
        that.SORT_TIMEOUT_DURATION = 35;
        that.DARK_MODE_ALPHA = 0.75;
        that.ANIMATE_IN_START_MARGIN = 20;

        that.INCOMPLETE_WORKS = 10;
        that.NO_WORKING_DAYS = 9;
        that.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT = 8;
        that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG = 7;
        that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT = 6;
        that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW = 5;
        that.UNFINISHED_FOR_TODAY = 4;
        that.FINISHED_FOR_TODAY = 3;
        that.NOT_YET_ASSIGNED = 2;
        that.COMPLETELY_FINISHED = 1;
    }
    
    percentageToColor(priority_percentage) {
        var that = this;
        const percentage_as_decimal = priority_percentage / 100;
        if (isNaN(percentage_as_decimal)) {
            var r = 255;
            var g = 255;
            var b = 255;
        } else {
            var r = lowest_priority_color.r + (highest_priority_color.r - lowest_priority_color.r) * percentage_as_decimal;
            var g = lowest_priority_color.g + (highest_priority_color.g - lowest_priority_color.g) * percentage_as_decimal;
            var b = lowest_priority_color.b + (highest_priority_color.b - lowest_priority_color.b) * percentage_as_decimal;
        }
        return {r, g, b};
    }
    // Handles coloring and animating assignments that were just created or edited
    colorOrAnimateInAssignment(dom_assignment) {
        var that = this;
        if ($("#animate-in").length && that.is_element_submitted) {
            // If a new assignment was created and the assignment that colorOrAnimateInAssignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"
            dom_assignment.parents(".assignment-container").animate({
                top: "0", 
                opacity: "1", 
                marginBottom: "0",
            }, 1500, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (color_priority) {
            if (that.params.first_sort) {
                dom_assignment.addClass("transition-instantly");
            }
            const background_color = that.percentageToColor(that.priority_percentage);
            const a = $("html").is("#dark-mode") ? that.DARK_MODE_ALPHA : 1;
            dom_assignment.parents(".assignment-container").toggleClass("invert-text-color", (background_color.r + background_color.g + background_color.b) / 3 <= 255 / 2);
            background_color.r = Math.round(background_color.r * a);
            background_color.g = Math.round(background_color.g * a);
            background_color.b = Math.round(background_color.b * a);
            dom_assignment.css("background-color", `rgb(${background_color.r},${background_color.g},${background_color.b})`);
            dom_assignment.toggleClass("mark-as-done", that.mark_as_done);
            if (that.params.first_sort) {
                dom_assignment[0].offsetHeight;
                dom_assignment.removeClass("transition-instantly");
            }
        }
    }
    setInitialAssignmentTopOffset($assignment_container) {
        var that = this;
        $assignment_container.attr("data-initial-top-offset", $assignment_container.offset().top);
    }

    domSortAssignments(priority_data_list) {
        var that = this;
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
                    transitionDuration: `${1.75 + Math.abs(transform_value)/2000}s`, // Delays longer transforms
                });
    }        

    positionTags(dom_assignment) {
        var that = this;
        dom_assignment.removeClass("tags-bottom");
        horizontal_tag_position === "Left" && that.positionTagLeftAndTagBottom(dom_assignment);
        vertical_tag_position === "Bottom" && dom_assignment.addClass("tags-bottom");
    }
    positionTagLeftAndTagBottom(dom_assignment) {
        var that = this;
        const dom_title = dom_assignment.find(".title");
        const dom_tags = dom_assignment.find(".tags");
        const dom_button = dom_assignment.find(".button");
        const dom_assignment_footer = dom_assignment.find(".assignment-footer");
        const add_priority_percentage = !!dom_title.attr("data-priority");
        const add_daysleft = !!dom_title.attr("data-daysleft");
        dom_assignment.css({paddingTop: "", paddingBottom: ""});
        dom_button.css({marginTop: "", marginBottom: ""});

        const tag_top = dom_tags.offset().top;
        const tag_height = dom_tags.height();

        let title_top = dom_title.offset().top;
        if (horizontal_tag_position === "Left") {
            if (vertical_tag_position === "Bottom") {
                if (add_daysleft) title_top -= 14;
            } else if (add_priority_percentage) {
                title_top -= 10;
            } else {
                title_top += 3;
            }
        }
        
        const padding_to_add = Math.max(0, tag_top - title_top + tag_height);
        dom_assignment.css({paddingTop: "+=" + padding_to_add, paddingBottom: "+=" + padding_to_add});
        dom_button.css({marginTop: "-=" + padding_to_add, marginBottom: "-=" + padding_to_add});
        dom_assignment_footer.css("top", parseFloat(dom_assignment.css("padding-bottom")) - parseFloat(dom_assignment_footer.find(".graph-container").first().css("margin-top")));
        dom_tags.prop("style").setProperty('--margin-top', parseFloat(dom_assignment.css("padding-bottom")));
    }
    updateAssignmentHeaderMessagesAndSetPriorityData() {
        var that = this;
        $(".assignment").each(function(index) {
            const dom_assignment = $(this);
            const sa = new Assignment(dom_assignment);
            sa.setParabolaValues();
            if (that.params.first_sort) {
                // Fix dynamic start if y or anything else was changed
                // setParabolaValues needs to be above for it doesn't run in this function with fixed mode

                // Don't sa.autotuneSkewRatio() because we don't want to change the skew ratio when the user hasn't submitted any work inputs
                const old_dynamic_start = sa.sa.dynamic_start;
                sa.setDynamicStartIfInDynamicMode();
                old_dynamic_start !== sa.sa.dynamic_start && ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
            }
            let display_format_minutes = false;
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            // || date_now for displaying daysleft for needs more info if the due date exists but the assignment date doesn't
            let today_minus_ad = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date || date_now);
            let todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
            const assignment_container = $(".assignment-container").eq(index),
                dom_status_image = $(".status-image").eq(index),
                dom_status_message = $(".status-message").eq(index),
                dom_title = $(".title").eq(index),
                dom_completion_time = $(".completion-time").eq(index),
                dom_tags = $(".tags").eq(index);
            let has_autofilled = false;
            let first_tag = sa.sa.tags[0];
            if (["Important","Not Important"].includes(first_tag)) first_tag = undefined;
            const number_of_forgotten_days = today_minus_ad - (sa.sa.blue_line_start + len_works); // Make this a variable so len_works++ doesn't affect this
            if (!sa.sa.needs_more_info && that.params.autofill_all_work_done && number_of_forgotten_days > 0) {
                for (let i = 0; i < number_of_forgotten_days; i++) {
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                    // Don't use "sa.sa.soft" logic because this will always complete the assignment if the due date already passed
                    if (len_works + sa.sa.blue_line_start === sa.sa.x) break; // Don't autofill past completion
                    has_autofilled = true;
                    last_work_input += Math.max(0, todo);
                    sa.sa.works.push(last_work_input);
                    len_works++;
                }
                if (has_autofilled) {
                    // don't sa.setDynamicStartIfInDynamicMode() because of the (input_done !== todo) check
                    ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                    ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                }
            }
            let alert_due_date_passed_cond;
            let str_daysleft, status_value, status_message, status_image, due_date_minus_today;
            if (sa.sa.needs_more_info) {
                status_image = 'question-mark';
                if (sa.sa.is_google_classroom_assignment) {
                    status_message = "This Google Classroom Assignment needs more Info!<br>Please Edit this Assignment";
                    if (first_tag)
                        status_value = that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG;
                    else
                        status_value = that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT;
                } else {
                    status_message = "This Assignment needs more Info!<br>Please Edit this Assignment";
                    status_value = that.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT;
                }
                dom_status_image.attr({
                    width: 11,
                    height: 18,
                }).css("margin-left", 2);

                // Copy paste of some below code
                if (Number.isFinite(sa.sa.x)) {
                    due_date_minus_today = sa.sa.x - today_minus_ad;
                    if (due_date_minus_today < -1) {
                        str_daysleft = -due_date_minus_today + "d Ago";
                    } else if (due_date_minus_today === -1) {
                        str_daysleft = 'Yesterday';
                    } else if (due_date_minus_today === 0) {
                        str_daysleft = 'Today';
                    } else if (due_date_minus_today === 1) {
                        str_daysleft = 'Tomorrow';
                    } else if (due_date_minus_today < 7) {
                        const due_date = new Date((sa.sa.assignment_date || date_now).valueOf());
                        due_date.setDate(due_date.getDate() + sa.sa.x);
                        str_daysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                    } else {
                        str_daysleft = due_date_minus_today + "d";
                    }
                }

            // (sa.sa.x <= today_minus_ad && !sa.sa.soft)
            // This marks the assignment as completed if its due date passes
            // However, if the due date is soft, the system doesnt know whether or not the user finished the assignment or needs to extend its due date
            // So, dont star it because the user may misinterpret that as having completed the assignment when in reality the user may need an extension
            // Instead, give it a question mark so it can be appropriately handled
            } else if (last_work_input >= sa.sa.y || (sa.sa.x <= today_minus_ad && !sa.sa.soft)) {
                status_image = "completely-finished";
                if (last_work_input >= sa.sa.y) {
                    status_message = 'You\'re Completely Finished with this Assignment';
                } else {
                    alert_due_date_passed_cond = true;
                    if (!sa.sa.has_alerted_due_date_passed_notice) {
                        that.due_date_passed_notices.push(`"${sa.sa.name}"`);
                        sa.sa.has_alerted_due_date_passed_notice = true;
                        ajaxUtils.sendAttributeAjaxWithTimeout("has_alerted_due_date_passed_notice", sa.sa.has_alerted_due_date_passed_notice, sa.sa.id);
                    }
                    status_message = 'This Assignment\'s Due Date has Passed';
                }
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
                status_value = that.COMPLETELY_FINISHED;
            } else if (today_minus_ad < 0) {
                status_image = "no-status-image";
                status_message = 'This Assignment hasn\'t yet been Assigned';
                if (today_minus_ad === -1) {
                    str_daysleft = 'Assigned Tomorrow';
                } else if (today_minus_ad > -7) {
                    str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                    str_daysleft = `Assigned in ${-today_minus_ad}d`;
                }
                status_value = that.NOT_YET_ASSIGNED;
            } else {
                // if (alert_due_date_passed_cond && sa.sa.has_alerted_due_date_passed_notice)
                // The above code alerts the notice and ajaxs the due date passed notice as true
                // if !alert_due_date_passed_cond && sa.sa.has_alerted_due_date_passed_notice)
                // The following code ajaxs the due date passed notice as false
                if (!alert_due_date_passed_cond && sa.sa.has_alerted_due_date_passed_notice) {
                    sa.sa.has_alerted_due_date_passed_notice = false;
                    ajaxUtils.sendAttributeAjaxWithTimeout("has_alerted_due_date_passed_notice", sa.sa.has_alerted_due_date_passed_notice, sa.sa.id);
                }
                if (that.params.autofill_no_work_done && number_of_forgotten_days > 0) {
                    let reached_end_of_assignment = false;
                    for (let i = 0; i < number_of_forgotten_days; i++) {
                        if (!sa.sa.soft && len_works + sa.sa.blue_line_start === sa.sa.x - 1) {
                            reached_end_of_assignment = true;
                            break;
                        }
                        has_autofilled = true;
                        sa.sa.works.push(last_work_input);
                        len_works++;
                    }
                    /**
                     * 
                     * t x   r
                     * 1 5 > 5
                     * 2 5 > 5
                     * 3 5 > 5
                     * 4 5 > 5
                     * 5 5 > 6
                     * 6 6 > 7
                     * 7 7 > 8
                     * 10 7 > 11
                     */
                    if (sa.sa.soft && today_minus_ad >= sa.sa.x) {
                        sa.sa.x = today_minus_ad + 1;
                        const due_date = new Date(sa.sa.assignment_date.valueOf());
                        due_date.setDate(due_date.getDate() + sa.sa.x);
                        ajaxUtils.sendAttributeAjaxWithTimeout("x", due_date.getTime()/1000, sa.sa.id);
                    }
                    // Remove from "if has_autofilled" because this may need to run even if nothing autofills
                    ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.concat(reached_end_of_assignment ? [last_work_input] : []).map(String), sa.sa.id);
                    if (has_autofilled) {
                        for (let i = 0; i < AUTOTUNE_ITERATIONS; i++) {
                            sa.setDynamicStartIfInDynamicMode();
                            sa.autotuneSkewRatio();
                        }
                        sa.setDynamicStartIfInDynamicMode();
                        ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                        ajaxUtils.sendAttributeAjaxWithTimeout("skew_ratio", sa.sa.skew_ratio, sa.sa.id);
                        todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                    }
                }
                let x1 = sa.sa.x - sa.red_line_start_x;
                if (sa.sa.break_days.length) {
                    const mods = sa.calcModDays();
                    x1 -= Math.floor(x1 / 7) * sa.sa.break_days.length + mods[x1 % 7];
                }
                due_date_minus_today = sa.sa.x - today_minus_ad;
                const todo_is_completed = todo <= 0 || today_minus_ad < len_works + sa.sa.blue_line_start;
                const current_work_input_is_break_day = sa.sa.break_days.includes((sa.assign_day_of_week + today_minus_ad) % 7) && due_date_minus_today !== 1;
                if (today_minus_ad > len_works + sa.sa.blue_line_start || !x1) {
                    status_image = 'question-mark';
                    if (!x1) {
                        status_message = 'This Assignment has no Working Days!<br>Please Edit this Assignment\'s break days';
                        status_value = that.NO_WORKING_DAYS;
                    } else {
                        status_message = "You haven't Entered your past Work Inputs!<br>Please Enter your Progress to Continue";
                        status_value = that.INCOMPLETE_WORKS;
                    }
                    sa.sa.mark_as_done === true && ajaxUtils.sendAttributeAjaxWithTimeout("mark_as_done", false, sa.sa.id);
                    sa.sa.mark_as_done = false;
                    dom_status_image.attr({
                        width: 11,
                        height: 18,
                    }).css("margin-left", 2);
                } else if (todo_is_completed || current_work_input_is_break_day) {
                    status_image = 'finished';
                    if (current_work_input_is_break_day) {
                        status_message = 'Today is this Assignment\'s Break Day';
                    } else {
                        status_message = 'Nice Job! You\'re Finished with this Assignment\'s Work for Today';
                    }
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    status_value = that.FINISHED_FOR_TODAY;
                } else {
                    status_value = that.UNFINISHED_FOR_TODAY;
                    display_format_minutes = true;
                    status_image = 'unfinished';
                    status_message = "This Assignment's Daily Work is Unfinished";
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    if (sa.unit_is_of_time) {
                        status_message += `<br>Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo)} of Work Today`;
                    } else {
                        status_message += `<br>Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo)} Today`;
                    }
                    that.total_completion_time += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                }
                if (due_date_minus_today < -1) {
                    str_daysleft = -due_date_minus_today + "d Ago";
                } else if (due_date_minus_today === -1) {
                    str_daysleft = 'Yesterday';
                } else if (due_date_minus_today === 0) {
                    str_daysleft = 'Today';
                } else if (due_date_minus_today === 1) {
                    str_daysleft = 'Tomorrow';
                    that.tomorrow_total_completion_time += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                    if ([that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, that.UNFINISHED_FOR_TODAY, that.FINISHED_FOR_TODAY, that.NOT_YET_ASSIGNED, that.COMPLETELY_FINISHED].includes(status_value)) {
                        status_value = that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW;
                    }
                } else if (due_date_minus_today < 7) {
                    const due_date = new Date(sa.sa.assignment_date.valueOf());
                    due_date.setDate(due_date.getDate() + sa.sa.x);
                    str_daysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                } else {
                    str_daysleft = due_date_minus_today + "d";
                }
            }
            // Ignore tags if its a google classroom assignment and it needs more info because important and not important can mess up some ordering
            // Not needed anymore because of that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG
            // if (!(sa.sa.is_google_classroom_assignment && sa.sa.needs_more_info)) {
                if (sa.sa.tags.includes("Important")) {
                    status_value += 0.25;
                }
                if (sa.sa.tags.includes("Not Important")) {
                    status_value -= 0.25;
                }
            // }
            const ignore_tag_status_value = Math.round(status_value);
            // Add finished to assignment-container so it can easily be deleted with $(".finished").remove() when all finished assignments are deleted in advanced
            assignment_container.toggleClass("finished", ignore_tag_status_value === that.COMPLETELY_FINISHED);
            assignment_container.toggleClass("incomplete-works", ignore_tag_status_value === that.INCOMPLETE_WORKS);
            assignment_container.toggleClass("question-mark", [that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, that.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, that.NO_WORKING_DAYS, that.INCOMPLETE_WORKS].includes(ignore_tag_status_value));
            assignment_container.toggleClass("add-line-wrapper", ignore_tag_status_value === that.COMPLETELY_FINISHED || ignore_tag_status_value === that.INCOMPLETE_WORKS);

            let status_priority;
            if (ignore_tag_status_value === that.COMPLETELY_FINISHED) {
                status_priority = -index;
            } else if (ignore_tag_status_value === that.NOT_YET_ASSIGNED) {
                status_priority = today_minus_ad;
            } else if ([that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, that.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT].includes(ignore_tag_status_value)) {
                // Don't use NaN because NaN === NaN is false for calculations used later
                status_priority = undefined;
            } else if ([that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, that.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, that.NO_WORKING_DAYS, that.INCOMPLETE_WORKS].includes(ignore_tag_status_value)) {
                // Order question mark assignments by their absolute distance to their due date
                status_priority = -Math.abs(due_date_minus_today);
            } else {
                status_priority = todo*sa.sa.time_per_unit/(sa.sa.x-sa.sa.blue_line_start-len_works);
            }

            let priority_data = {
                status_value, 
                status_priority, 
                first_tag, 
                name: sa.sa.name, 
                index, 
                mark_as_done: false,
            };
            if (sa.sa.mark_as_done && [that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, that.UNFINISHED_FOR_TODAY, that.FINISHED_FOR_TODAY, that.NOT_YET_ASSIGNED, that.COMPLETELY_FINISHED].includes(ignore_tag_status_value)) {
                priority_data.mark_as_done = true;
            }
            that.priority_data_list.push(priority_data);

            if (status_image === "no-status-image") {
                dom_status_image.hide();
                dom_status_image.removeAttr("src");
            } else {
                dom_status_image.show();
                dom_status_image.attr("src", `/static/images/status-icons/${status_image}.png`);
            }
            dom_status_message.html(status_message);
            dom_title.attr("data-daysleft", str_daysleft);
            dom_tags.toggleClass("assignment-has-daysleft", vertical_tag_position === "Bottom" && horizontal_tag_position === "Left" && !!str_daysleft);
            dom_completion_time.html(display_format_minutes ? utils.formatting.formatMinutes(todo * sa.sa.time_per_unit) : '');
        });
    }
    assignmentSortingComparator(a, b) {
        var that = this;
        // Max to min
        if (a.status_value < b.status_value) return 1;
        if (a.status_value > b.status_value) return -1;

        const ignore_tag_status_value = Math.round(a.status_value); // using b.status_value also works
        if ([that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG].includes(ignore_tag_status_value) 
        || reverse_sorting && [that.UNFINISHED_FOR_TODAY, that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value)) {
            // If the assignment is a google classroom assignment that needs more info and has a first tag (because the status priority is now their first tag) or is sorting in reverse, sort from min to max
            if (a.status_priority < b.status_priority) return -1;
            if (a.status_priority > b.status_priority) return 1;
        } else {
            if (a.status_priority < b.status_priority) return 1;
            if (a.status_priority > b.status_priority) return -1;
        }
        if (a.first_tag < b.first_tag) return -1;
        if (a.first_tag > b.first_tag) return 1;

        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;

        // If everything is the same, sort them by their index, which will always be different from each other
        // Sort from min to max otherwise they will infinitly swap with each other every time they are resorted
        if (a.index < b.index) return -1;
        if (a.index > b.index) return 1;
    }
    priorityDataToPriorityPercentage(priority_data) {
        var that = this;
        const ignore_tag_status_value = Math.round(priority_data.status_value);

        if ([that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, that.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, that.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, that.NO_WORKING_DAYS, that.INCOMPLETE_WORKS].includes(ignore_tag_status_value)) {
            var priority_percentage = NaN;
        } else if (that.mark_as_done || [that.FINISHED_FOR_TODAY, that.NOT_YET_ASSIGNED, that.COMPLETELY_FINISHED].includes(ignore_tag_status_value) /* that.NOT_YET_ASSIGNED needed for "This assignment has not yet been assigned" being set to color values greater than 1 */) {
            var priority_percentage = 0;
        } else {
            var priority_percentage = Math.max(1, Math.floor(priority_data.status_priority / that.highest_priority * 100 + 1e-10));
            if (!Number.isFinite(priority_percentage)) {
                priority_percentage = 100;
            }
        }
        return priority_percentage;
    }
    addAssignmentShortcut(dom_assignment) {
        var that = this;
        // Loops through every google classroom assignment that needs more info AND has a tag (representing their class) to add "delete all assignments of this class"
        // Uses the same below logic for delete starred assignments and autoill work done

        // This has to be looped before they are sorted so setInitialAssignmentTopOffset is accurate
        // This means we can't loop through ".assignment-container" because it's currently unsorted, so we instead have to loop through that.priority_data_list
        // The current looped assignment's tag is compared with the previous looped assignment's tag
        // If they are different, the previous assignment is the last assignment with its tag and the current assignment is the first assignment with its tag
        const sa = utils.loadAssignmentData(dom_assignment);

        const ignore_tag_status_value = Math.round(that.priority_data.status_value);

        if (!["Not Important", "Important"].includes(sa.tags[0]))
            var current_tag = sa.tags[0];
        if (sa.is_google_classroom_assignment && sa.needs_more_info && current_tag) {
            const assignment_container = that.dom_assignment.parents(".assignment-container");
            assignment_container.addClass("add-line-wrapper");
            if (current_tag !== that.prev_tag) { // Still works if an assignment needs more info but doesn't have a tag
                if (that.prev_assignment_container) that.prev_assignment_container.addClass("last-add-line-wrapper");
                assignment_container.addClass("first-add-line-wrapper").prepend($(DELETE_GC_ASSIGNMENTS_FROM_CLASS_TEMPLATE));
            }
            that.prev_tag = current_tag;
            that.prev_assignment_container = assignment_container;
        }

        if (ignore_tag_status_value === that.INCOMPLETE_WORKS && !that.already_found_first_incomplete_works) {
            $("#autofill-work-done").show().insertBefore(dom_assignment);
            that.already_found_first_incomplete_works = true;
        }
        if (ignore_tag_status_value === that.COMPLETELY_FINISHED && !that.already_found_first_finished) {
            $("#delete-starred-assignments").show().insertBefore(dom_assignment);
            that.already_found_first_finished = true;
        }
    }
    updateInfoHeader() {
        var that = this;
        if (that.question_mark_exists_excluding_gc) {
            $("#current-time, #tomorrow-time, #info").hide();
        } else if (!that.total_completion_time) {
            $("#info").show();
            $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
            $("#current-time, #tomorrow-time, #hide-button").hide();
        } else {
            $("#current-time, #tomorrow-time, #hide-button, #info").show();
            $("#estimated-total-time").html(utils.formatting.formatMinutes(that.total_completion_time)).attr("data-minutes", that.total_completion_time);
            $("#tomorrow-time").html(` (${that.tomorrow_total_completion_time === that.total_completion_time ? "All" : utils.formatting.formatMinutes(that.tomorrow_total_completion_time)} due Tomorrow)`);
            if (that.tomorrow_total_completion_time === that.total_completion_time) {
                $("#tomorrow-time").html(" (Everything is due Tomorrow)");
            } else if (that.tomorrow_total_completion_time === 0) {
                $("#tomorrow-time").html(" (Nothing is due Tomorrow)");
            } else {
                $("#tomorrow-time").html(` (${utils.formatting.formatMinutes(that.tomorrow_total_completion_time)} due Tomorrow)`);
            }
        }
        utils.ui.old_minute_value = undefined; // Force tickClock to update. Without this, it may not update and display (Invalid Date)
        utils.ui.tickClock();
        if (that.params.first_sort) {
            setInterval(utils.ui.tickClock, 1000);
        }
    }
    sort(params={first_sort: false, autofill_all_work_done: false, autofill_no_work_done: false, timeout: false}) {
        var that = this;
        that.params = params;
        clearTimeout(that.sort_timeout);
        if (that.params.timeout) {
            that.sort_timeout = setTimeout(() => that.sortWithoutTimeout(), that.SORT_TIMEOUT_DURATION);
        } else {
            that.sortWithoutTimeout();
        }
    }
    sortWithoutTimeout() {
        var that = this;
        that.priority_data_list = [];
        that.total_completion_time = 0;
        that.tomorrow_total_completion_time = 0;
        that.due_date_passed_notices = [];
        that.updateAssignmentHeaderMessagesAndSetPriorityData();
        if (that.due_date_passed_notices.length === 1) {
            $.alert({
                title: `Notice: The assignment ${utils.formatting.arrayToEnglish(that.due_date_passed_notices)} has been marked as completely finished because its due date has passed.`,
            });
        } else if (that.due_date_passed_notices.length > 1) {
            $.alert({
                title: `Notice: The assignments ${utils.formatting.arrayToEnglish(that.due_date_passed_notices)} have been marked as completely finished because their due dates have passed.`
            });
        }
        // Updates open graphs' today line and other graph text
        $(window).trigger("resize");
        that.priority_data_list.sort((a,b) => that.assignmentSortingComparator(a,b));
        // Source code lurkers, uncomment this for some fun
        // function shuffleArray(array) {for (var i = array.length - 1; i > 0; i--) {var j = Math.floor(Math.random() * (i + 1));var temp = array[i];array[i] = array[j];array[j] = temp;}};shuffleArray(that.priority_data_list);
        that.highest_priority = Math.max(...that.priority_data_list.map(function(priority_data) {
            const ignore_tag_status_value = Math.round(priority_data.status_value);
            if ([that.UNFINISHED_FOR_TODAY, that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value) && !priority_data.mark_as_done) {
                return priority_data.status_priority;
            } else {
                return -Infinity;
            }
        }));
        that.question_mark_exists_excluding_gc = that.priority_data_list.some(function(priority_data) {
            const ignore_tag_status_value = Math.round(priority_data.status_value);
            return [that.NO_WORKING_DAYS, that.INCOMPLETE_WORKS].includes(ignore_tag_status_value);
        });
        that.prev_assignment_container = undefined;
        that.prev_tag = undefined;
        that.already_found_first_incomplete_works = false;
        that.already_found_first_finished = false;
        $("#autofill-work-done, #delete-starred-assignments").hide();
        $(".delete-gc-assignments-from-class").remove();
        $(".first-add-line-wrapper, .last-add-line-wrapper").removeClass("first-add-line-wrapper last-add-line-wrapper");
        for (let [index, priority_data] of that.priority_data_list.entries()) {
            that.priority_data = priority_data;
            const ignore_tag_status_value = Math.round(that.priority_data.status_value);
            // originally ignore_tag_status_value <= that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW && (that.priority_data.mark_as_done || that.question_mark_exists_excluding_gc); if that.priority_data.mark_as_done is true then ignore_tag_status_value <= that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW
            const mark_as_done = !!(that.priority_data.mark_as_done || that.question_mark_exists_excluding_gc && [that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, that.UNFINISHED_FOR_TODAY, that.FINISHED_FOR_TODAY, that.NOT_YET_ASSIGNED, that.COMPLETELY_FINISHED].includes(ignore_tag_status_value));
            that.mark_as_done = mark_as_done;
            const dom_assignment = $(".assignment").eq(that.priority_data.index); // Need to define this so the resolved promise can access it
            that.dom_assignment = dom_assignment;
            const assignment_container = that.dom_assignment.parents(".assignment-container");            

            let priority_percentage = that.priorityDataToPriorityPercentage(that.priority_data);
            that.priority_percentage = priority_percentage;
            const add_priority_percentage = text_priority && [that.UNFINISHED_FOR_TODAY, that.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value) && !that.mark_as_done;
            const dom_title = $(".title").eq(that.priority_data.index);
            dom_title.attr("data-priority", add_priority_percentage ? `Priority: ${that.priority_percentage}%` : "");

            const first_sort = that.params.first_sort;
            new Promise(function(resolve) {
                if (that.params.first_sort) {
                    $(window).one("load", resolve);
                } else {
                    resolve();
                }
            }).then(function() {
                that.positionTags(dom_assignment);
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
                            // scrollIntoView sometimes doesn't work without setTimeout
                            assignment_to_scroll_to[0].scrollIntoView({
                                behavior: 'smooth',
                                block: 'nearest',
                            });
                        }, 0);
                        // utils.scroll determines when the page has stopped scrolling and internally resolves the promise
                        $("main").scroll(() => utils.scroll(resolve));
                        utils.scroll(resolve);
                    });
                }).then(function() {
                    that.is_element_submitted = true;
                    that.priority_percentage = priority_percentage;
                    that.params.first_sort = first_sort;
                    that.mark_as_done = mark_as_done;
                    that.colorOrAnimateInAssignment(dom_assignment);
                });
            } else {
                that.is_element_submitted = false;
                that.colorOrAnimateInAssignment(dom_assignment);
            }
            that.addAssignmentShortcut(that.dom_assignment);
        }
        // End part of addAssignmentShortcut
        if (that.prev_assignment_container) {
            that.prev_assignment_container.addClass("last-add-line-wrapper");
        }
        if (!that.params.first_sort) {
            $(".assignment-container").each(function() {
                that.setInitialAssignmentTopOffset($(this));
            });
        }
        that.domSortAssignments(that.priority_data_list);
        const number_of_assignments = $(".assignment").length;
        $(".assignment-container").each(function(index) {
            const assignment_container = $(this);
            // Fixes the tag add box going behind the below assignment on hover
            const dom_assignment = assignment_container.children(".assignment");
            dom_assignment.css("z-index", number_of_assignments - index);
            if (!that.params.first_sort) {
                that.transitionSwap(assignment_container);
            }
        });

        // Make sure this is set after assignments are sorted and swapped
        if (that.params.first_sort && $("#animate-in").length) {
            // Set initial transition values for "#animate-in"
            // Needs to be after domswap or else "top" bugs out 
            
            // Load the fonts first or height() may return the wrong values
            document.fonts.ready.then(function() {
                $("#animate-in").css({
                    top: $("#assignments-container").offset().top + $("#assignments-container").height() - $("#animate-in").offset().top + that.ANIMATE_IN_START_MARGIN, // Moves animate in a bit below the last assignment to give it more breathing room
                    opacity: "0",
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
    DELETE_GC_ASSIGNMENTS_FROM_CLASS_TEMPLATE = $("#delete-gc-assignments-from-class-template").html();
    priority = new Priority();
    priority.sort({ first_sort: true });
});