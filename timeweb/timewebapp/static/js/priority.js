// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Priority {
    static ANIMATE_IN_DURATION = 1500 * SETTINGS.animation_speed;
    static SWAP_TRANSITION_DELAY_FUNCTION = transform_value => (1.75 + Math.abs(transform_value) / 2000) * SETTINGS.animation_speed;
    static SORT_TIMEOUT_DURATION = 35;
    static DARK_MODE_ALPHA = 0.6;
    static ANIMATE_IN_START_MARGIN = 20; // Moves animate in a bit below the last assignment to give it more breathing room

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
    
    percentageToColor(priority_percentage) {
        const that = this;
        const percentage_as_decimal = priority_percentage / 100;
        if (isNaN(percentage_as_decimal)) {
            var h = 0;
            var s = 0;
            var v = 100;
        } else {
            const low_hsv = utils.formatting.rgbToHSV(SETTINGS.lowest_priority_color.r, SETTINGS.lowest_priority_color.g, SETTINGS.lowest_priority_color.b);
            const high_hsv = utils.formatting.rgbToHSV(SETTINGS.highest_priority_color.r, SETTINGS.highest_priority_color.g, SETTINGS.highest_priority_color.b);
            var h = low_hsv.h + (high_hsv.h - low_hsv.h) * percentage_as_decimal;
            var s = low_hsv.s + (high_hsv.s - low_hsv.s) * percentage_as_decimal;
            var v = low_hsv.v + (high_hsv.v - low_hsv.v) * percentage_as_decimal;
        }
        return utils.formatting.hsvToRGB(h, s, v);
    }
    // Handles coloring and animating assignments that were just created or edited
    colorOrAnimateInAssignment(dom_assignment) {
        const that = this;
        if ($("#animate-in").length && that.is_element_submitted) {
            // If a new assignment was created and the assignment that colorOrAnimateInAssignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"

            // Don't make this a CSS animation because margin-bottom is used a lot on .assignment-container and it's easier if it doesn't have a css transition
            dom_assignment.parents(".assignment-container").animate({
                top: "0",
                opacity: "1",
                marginBottom: "0",
            }, Priority.ANIMATE_IN_DURATION, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (SETTINGS.color_priority) {
            if (that.params.first_sort) {
                dom_assignment.addClass("transition-instantly");
            }
            const background_color = that.percentageToColor(that.priority_percentage);
            dom_assignment.parents(".assignment-container").toggleClass("invert-text-color",
                // https://awik.io/determine-color-bright-dark-using-javascript/
                Math.sqrt(
                    0.299 * (background_color.r * background_color.r) +
                    0.587 * (background_color.g * background_color.g) +
                    0.114 * (background_color.b * background_color.b)
                ) <= 127.5
            );

            const a = $("html").is("#dark-mode") ? Priority.DARK_MODE_ALPHA : 1;
            background_color.r *= a;
            background_color.g *= a;
            background_color.b *= a;

            // You can also do this (they are the same)
            // background_color = utils.formatting.rgbToHSV(background_color.r, background_color.g, background_color.b);
            // background_color.v *= a;
            // background_color = utils.formatting.hsvToRGB(background_color.h, background_color.s, background_color.v);

            dom_assignment.css("background-color", `rgb(${background_color.r},${background_color.g},${background_color.b})`);
            dom_assignment.toggleClass("mark-as-done", that.mark_as_done);
            if (that.params.first_sort) {
                dom_assignment[0].offsetHeight;
                dom_assignment.removeClass("transition-instantly");
            }
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

    positionTags(dom_assignment) {
        const that = this;
        dom_assignment.removeClass("tags-bottom");
        SETTINGS.horizontal_tag_position === "Left" && that.positionTagLeftAndTagBottom(dom_assignment);
        SETTINGS.vertical_tag_position === "Bottom" && dom_assignment.addClass("tags-bottom");
    }
    positionTagLeftAndTagBottom(dom_assignment) {
        const that = this;
        const dom_title = dom_assignment.find(".title");
        const dom_tags = dom_assignment.find(".tags");
        const dom_button = dom_assignment.find(".button");
        const dom_assignment_footer = dom_assignment.find(".assignment-footer");
        const add_priority_percentage = !!dom_title.attr("data-priority");
        // Even though this is always true, it'll add this here for compatibility
        const add_daysleft = !!dom_title.attr("data-daysleft");
        dom_assignment.css({paddingTop: "", paddingBottom: ""});
        dom_button.css({marginTop: "", marginBottom: ""});

        const tag_top = dom_tags.offset().top;
        const tag_height = dom_tags.height();

        let title_top = dom_title.offset().top;
        if (SETTINGS.horizontal_tag_position === "Left") {
            //hard
            if (SETTINGS.vertical_tag_position === "Bottom") {
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
        const that = this;
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
            if (that.params.first_sort) {
                // Fix dynamic start if y or anything else was changed
                // setParabolaValues needs to be above for it doesn't run in this function with fixed mode

                // Don't sa.autotuneSkewRatio() because we don't want to change the skew ratio when the user hasn't submitted any work inputs
                const old_dynamic_start = sa.sa.dynamic_start;
                sa.setDynamicStartIfInDynamicMode();
                // !sa.sa.needs_more_info probably isn't needed but just in case as a safety mechanism
                !sa.sa.needs_more_info && old_dynamic_start !== sa.sa.dynamic_start && ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
            }
            
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
            let has_autofilled = false;
            let first_tag = sa.sa.tags[0];
            if (["Important","Not Important"].includes(first_tag)) first_tag = undefined;
            const number_of_forgotten_days = today_minus_assignment_date - (sa.sa.blue_line_start + len_works); // Make this a variable so len_works++ doesn't affect this
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
            let alert_due_date_passed_cond = false;
            let status_value, status_message, status_image, due_date_minus_today;
            if (sa.sa.needs_more_info) {
                status_image = 'question-mark';
                if (sa.sa.is_google_classroom_assignment) {
                    status_message = "This Google Classroom Assignment needs more Info!<br>Please Edit this Assignment";
                    status_value = first_tag ? Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG : Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT;
                } else {
                    status_message = "This Assignment needs more Info!<br>Please Edit this Assignment";
                    status_value = Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT;
                }
                //hard
                dom_status_image.attr({
                    width: 11,
                    height: 18,
                }).css("margin-left", 2);

            // (complete_due_date <= complete_date_now && !sa.sa.soft)
            // This marks the assignment as completed if its due date passes
            // However, if the due date is soft, the system doesnt know whether or not the user finished the assignment or needs to extend its due date
            // So, dont star it because the user may misinterpret that as having completed the assignment when in reality the user may need an extension
            // Instead, give it a question mark so it can be appropriately handled
            } else {
                let complete_due_date = new Date(sa.sa.assignment_date.valueOf());
                complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.sa.complete_x));
                if (sa.sa.due_time && (sa.sa.due_time.hour || sa.sa.due_time.minute)) {
                    complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.sa.due_time.hour * 60 + sa.sa.due_time.minute);
                }
                
                let complete_date_now = new Date(date_now.valueOf());
                let date_now_with_time = new Date();
                complete_date_now.setHours(date_now_with_time.getHours(), date_now_with_time.getMinutes(), 0, 0);
                if (last_work_input >= sa.sa.y || (complete_due_date <= complete_date_now && !sa.sa.soft)) {
                    status_image = "completely-finished";
                    if (last_work_input >= sa.sa.y) {
                        status_message = 'You\'re Completely Finished with this Assignment';
                    } else {
                        alert_due_date_passed_cond = true;
                        if (!sa.sa.has_alerted_due_date_passed_notice) {
                            // sa.sa.has_alerted_due_date_passed_notice will only be set to true after the user closes the alert modal
                            that.due_date_passed_notices.push(sa.sa);
                        }
                        status_message = 'This Assignment\'s Due Date has Passed';
                    }
                    //hard
                    dom_status_image.attr({
                        width: 16,
                        height: 16,
                    }).css("margin-left", -3);
                    status_value = Priority.COMPLETELY_FINISHED;
                } else if (today_minus_assignment_date < 0) {
                    status_message = 'This Assignment hasn\'t yet been Assigned';
                    status_value = Priority.NOT_YET_ASSIGNED;
                } else {
                    if (that.params.autofill_no_work_done && number_of_forgotten_days > 0) {
                        for (let i = 0; i < number_of_forgotten_days; i++) {
                            if (!sa.sa.soft && len_works + sa.sa.blue_line_start === sa.sa.x) {
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
                        if (sa.sa.soft && today_minus_assignment_date >= sa.sa.x) {
                            sa.sa.x = today_minus_assignment_date;
                            sa.incrementDueDate();
                        }
                        if (has_autofilled) {
                            for (let i = 0; i < AUTOTUNE_ITERATIONS; i++) {
                                sa.setDynamicStartIfInDynamicMode();
                                sa.autotuneSkewRatio();
                            }
                            sa.setDynamicStartIfInDynamicMode();
                            ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                            ajaxUtils.sendAttributeAjaxWithTimeout("skew_ratio", sa.sa.skew_ratio, sa.sa.id);
                            ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                            todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                        }
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
                    // Don't mark as no working days when the end of the assignment has been reached
                    const incomplete_past_inputs = today_minus_assignment_date > len_works + sa.sa.blue_line_start || complete_due_date <= complete_date_now;
                    // use complete_due_date <= complete_date_now instead of (complete_due_date <= complete_date_now && sa.sa.soft)
                    // if the conjugate is true, (complete_due_date <= complete_date_now && !sa.sa.soft), the assignment will be marked as due date passed
                    const no_working_days = sa.getWorkingDaysRemaining({ reference: "today" }) === 0 && len_works + sa.sa.blue_line_start !== sa.sa.x;
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
                            status_message = 'Today isn\'t this Assignment\'s Work Day';
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
                        status_message = "This Assignment's Daily Work is Unfinished";
                        //hard
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

                    if ([0, 1].includes(due_date_minus_today)) {
                        if (due_date_minus_today === 1) {
                            that.tomorrow_total_completion_time += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                        }
                        if (status_value === Priority.UNFINISHED_FOR_TODAY) {
                            status_value = Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW;
                        }
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
            if (status_value === Priority.NOT_YET_ASSIGNED) {
                if (today_minus_assignment_date === -1) {
                    str_daysleft = 'Assigned Tomorrow';
                } else if (today_minus_assignment_date > -7) {
                    str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                    str_daysleft = `Assigned in ${-today_minus_assignment_date}d`;
                }
            } else if (Number.isFinite(sa.sa.x)) {
                due_date_minus_today = Math.floor(sa.sa.complete_x) - today_minus_assignment_date;
                if (due_date_minus_today < -1) {
                    str_daysleft = -due_date_minus_today + "d Ago";
                } else if (due_date_minus_today === -1) {
                    str_daysleft = 'Yesterday';
                } else if (due_date_minus_today === 0) {
                    str_daysleft = 'Today';
                } else if (due_date_minus_today === 1) {
                    str_daysleft = 'Tomorrow';
                } else if (due_date_minus_today < 7) {
                    const due_date = new Date((sa.sa.assignment_date).valueOf());
                    due_date.setDate(due_date.getDate() + sa.sa.x);
                    str_daysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                } else {
                    str_daysleft = due_date_minus_today + "d";
                }
            }
            // Can't just define this once because len_works changes
            const already_entered_work_input_for_today = today_minus_assignment_date < len_works + sa.sa.blue_line_start;
            assignment_container.find(".button").filter(function() {
                return !!$(this).children(".tick-button").length;
            }).toggle(
                ![Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NOT_YET_ASSIGNED].includes(status_value)
            ).toggleClass("slashed", already_entered_work_input_for_today);

            // +Ignore tags if its a google classroom assignment and it needs more info because important and not important can mess up some ordering
            // -Not needed anymore because of Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG
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
            assignment_container.toggleClass("finished", ignore_tag_status_value === Priority.COMPLETELY_FINISHED)
                                .toggleClass("incomplete-works", ignore_tag_status_value === Priority.INCOMPLETE_WORKS)
                                .toggleClass("question-mark", [Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NO_WORKING_DAYS, Priority.INCOMPLETE_WORKS].includes(ignore_tag_status_value))
                                .toggleClass("add-line-wrapper", [Priority.COMPLETELY_FINISHED, Priority.INCOMPLETE_WORKS].includes(ignore_tag_status_value));

            let status_priority;
            if (ignore_tag_status_value === Priority.COMPLETELY_FINISHED) {
                status_priority = -index;
            } else if (ignore_tag_status_value === Priority.NOT_YET_ASSIGNED) {
                status_priority = today_minus_assignment_date;
            } else if ([Priority.FINISHED_FOR_TODAY, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT].includes(ignore_tag_status_value)) {
                // Include Priority.FINISHED_FOR_TODAY
                // If you're submitting work inputs for a check marked assignments ahead of time, it might swap with other check marked assignments, if this wasn't here and it went to the end of the if chain, which would make no sense

                // Don't use NaN because NaN === NaN is false for calculations used later
                status_priority = undefined;
            } else {
                // If due times are enabled, it's possible for (sa.sa.x - sa.sa.blue_line_start - len_works) to become negative
                // However this doesn't happen because the assignment will have been marked have completed in this scenario
                status_priority = todo * sa.sa.time_per_unit / (sa.sa.x - sa.sa.blue_line_start - len_works);
            }

            const priority_data = {
                status_value,
                status_priority,
                first_tag,
                name: sa.sa.name,
                index,
                // Not actually used for sorting, used for priority stuff later on
                mark_as_done: sa.sa.mark_as_done,
            };
            that.priority_data_list.push(priority_data);

            if (status_image) {
                dom_status_image.show();
                dom_status_image.attr("src", `https://storage.googleapis.com/twstatic/images/${status_image}.png`);
            } else {
                dom_status_image.hide();
                dom_status_image.removeAttr("src");
            }
            dom_status_message.html(status_message);
            dom_title.attr("data-daysleft", str_daysleft);
            // Even though this is always true, it'll add this here for compatibility
            dom_tags.toggleClass("assignment-has-daysleft", SETTINGS.vertical_tag_position === "Bottom" && SETTINGS.horizontal_tag_position === "Left" && !!str_daysleft);
            dom_completion_time.html(display_format_minutes ? utils.formatting.formatMinutes(todo * sa.sa.time_per_unit) : '');
        });
    }
    alertDueDates() {
        const that = this;
        let due_date_passed_notice_title;
        let due_date_passed_notice_content;
        if (that.due_date_passed_notices.length === 1) {
            due_date_passed_notice_title = `Important notice: The assignment "${that.due_date_passed_notices[0].name}" has been marked as completely finished because its due date has passed.`;
            due_date_passed_notice_content = "You can also enable soft due dates in the assignment form if you want the assignment's due date to automatically increment if you haven't finished it by then.";
        } else if (that.due_date_passed_notices.length > 1) {
            due_date_passed_notice_title = `Important notice: The assignments ${utils.formatting.arrayToEnglish(that.due_date_passed_notices.map(i => i.name))} have been marked as completely finished because their due dates have passed.`;
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
            due_date_incremented_notice_title = `Notice: the assignment "${that.due_date_incremented_notices[0].name}" has had its due date incremented because it has soft due dates enabled.`;
            due_date_incremented_notice_content = "This only occurs when an assignment's due date passes, but the assignment still isn't complete. If you don't want this to happen, disable soft due dates in the edit assignment form.";
        } else if (that.due_date_incremented_notices.length > 1) {
            due_date_incremented_notice_title = `Notice: the assignments ${utils.formatting.arrayToEnglish(that.due_date_incremented_notices.map(i => i.name))} have had their due dates incremented because they have soft due dates enabled.`;
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
        // Max to min
        if (a.status_value < b.status_value) return 1;
        if (a.status_value > b.status_value) return -1;

        const ignore_tag_status_value = Math.round(a.status_value); // using b.status_value also works
        if ([Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG].includes(ignore_tag_status_value) 
        || SETTINGS.reverse_sorting && [Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value)) {
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
        const that = this;
        const ignore_tag_status_value = Math.round(priority_data.status_value);

        if ([Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, Priority.NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, Priority.NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, Priority.NO_WORKING_DAYS, Priority.INCOMPLETE_WORKS].includes(ignore_tag_status_value)) {
            var priority_percentage = NaN;
        } else if (priority_data.mark_as_done || [Priority.FINISHED_FOR_TODAY, Priority.NOT_YET_ASSIGNED, Priority.COMPLETELY_FINISHED].includes(ignore_tag_status_value) /* Priority.NOT_YET_ASSIGNED needed for "This assignment has not yet been assigned" being set to color values greater than 1 */) {
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
        const that = this;
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

        if (ignore_tag_status_value === Priority.INCOMPLETE_WORKS && !that.already_found_first_incomplete_works) {
            $("#autofill-work-done").show().insertBefore(dom_assignment);
            that.already_found_first_incomplete_works = true;
        }
        if (ignore_tag_status_value === Priority.COMPLETELY_FINISHED && !that.already_found_first_finished) {
            $("#delete-starred-assignments").show().insertBefore(dom_assignment);
            that.already_found_first_finished = true;
        }
    }
    updateInfoHeader() {
        const that = this;
        if (!that.total_completion_time) {

            $("#estimated-total-time, #current-time, #tomorrow-time").removeClass("hide-info");
            $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
            $("#current-time, #tomorrow-time, #hide-button").hide();
        } else {
            $("#hide-button").html() === "Show" && $("#estimated-total-time, #current-time, #tomorrow-time").addClass("hide-info");
            $("#current-time, #tomorrow-time, #hide-button").show();
            $("#estimated-total-time").html(utils.formatting.formatMinutes(that.total_completion_time)).attr("data-minutes", that.total_completion_time);
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
    sort(params={first_sort: false, autofill_all_work_done: false, autofill_no_work_done: false, timeout: false, delayResize: false}) {
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
        that.priority_data_list = [];
        that.total_completion_time = 0;
        that.tomorrow_total_completion_time = 0;
        that.due_date_passed_notices = [];
        that.due_date_incremented_notices = [];
        that.updateAssignmentHeaderMessagesAndSetPriorityData();
        that.alertDueDates();
        
        // Updates open graphs' today line and other graph text
        setTimeout(() => {
            $(window).trigger("resize");
        }, that.params.delayResize ? VisualAssignment.CLOSE_ASSIGNMENT_TRANSITION_DURATION : 0);
        that.priority_data_list.sort((a, b) => that.assignmentSortingComparator(a, b));
        // Source code lurkers, uncomment this for some fun
        // function shuffleArray(array) {for (var i = array.length - 1; i > 0; i--) {var j = Math.floor(Math.random() * (i + 1));var temp = array[i];array[i] = array[j];array[j] = temp;}};shuffleArray(that.priority_data_list);
        that.highest_priority = Math.max(...that.priority_data_list.map(function(priority_data) {
            const ignore_tag_status_value = Math.round(priority_data.status_value);
            if ([Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value) && !priority_data.mark_as_done) {
                return priority_data.status_priority;
            } else {
                return -Infinity;
            }
        }));
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

            const mark_as_done = that.priority_data.mark_as_done;
            that.mark_as_done = mark_as_done;

            const dom_assignment = $(".assignment").eq(that.priority_data.index); // Need to define this so the resolved promise can access it
            that.dom_assignment = dom_assignment;

            const assignment_container = that.dom_assignment.parents(".assignment-container");            

            let priority_percentage = that.priorityDataToPriorityPercentage(that.priority_data);
            that.priority_percentage = priority_percentage;
            const add_priority_percentage = SETTINGS.text_priority && [Priority.UNFINISHED_FOR_TODAY, Priority.UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value) && !that.mark_as_done;
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
            
            // First paint is before the fonts load; #animate-in is shown
            $("#animate-in").hide();
            // Load the fonts first or height() may return the wrong values
            document.fonts.ready.then(function() {
                $("#animate-in").css({
                    display: "",
                    top: $("#assignments-container").offset().top + $("#assignments-container").height() - $("#animate-in").offset().top + Priority.ANIMATE_IN_START_MARGIN,
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

        $("#tutorial-click-assignment-to-open").remove();
        utils.ui.insertTutorialMessages();

        that.updateInfoHeader();
        $("#assignments-container").css("opacity", "1");
        
    }
}
document.addEventListener("DOMContentLoaded", function() {
    DELETE_GC_ASSIGNMENTS_FROM_CLASS_TEMPLATE = $("#delete-gc-assignments-from-class-template").html();
    priority = new Priority();
    priority.sort({ first_sort: true });
});