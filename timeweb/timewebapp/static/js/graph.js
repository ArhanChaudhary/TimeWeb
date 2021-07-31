/* 
This file includes the code for:

Transitioning the opening and closing of assignments
Drawing the graph
The graph's buttons and inputs

This only runs on index.html
*/

//
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
//

class Assignment {
    constructor(dom_assignment) {
        this.sa = utils.loadAssignmentData(dom_assignment);
        this.red_line_start_x = this.sa.fixed_mode ? 0 : this.sa.dynamic_start; // X-coordinate of the start of the red line
        this.red_line_start_y = this.sa.fixed_mode ? 0 : this.sa.works[this.red_line_start_x - this.sa.blue_line_start]; // Y-coordinate of the start of the red line
        // Not sure if these if stataments are actually needed but I included them in the original program, and there doesnt seem to be any harm
        // Caps values
        const y1 = this.sa.y - this.red_line_start_y;
        if (this.sa.funct_round > y1) {
            this.sa.funct_round = y1;
        }
        if (this.sa.min_work_time > y1) {
            this.sa.min_work_time = y1;
        }
        // If funct_round is greater than min_work_time, every increase in work already fulfills the minimum work time
        // Set it to 0 to pretend it isn't enabled for calculations in setParabolaValues()
        if (this.sa.min_work_time <= this.sa.funct_round) {
            this.sa.min_work_time = 0;
        // Suppose funct_round is 4, min_work_time is 5, f(4) = 18, and f(5) = 23
        // f(4) gets rounded to 20 and f(5) gets rounded to 24, violating the min_work_time of 5
        // This fixes the problem
        } else if (this.sa.funct_round < this.sa.min_work_time && this.sa.min_work_time < 2 * this.sa.funct_round) {
            this.sa.min_work_time = this.sa.funct_round * 2;
        }
        this.min_work_time_funct_round = this.sa.min_work_time ? Math.ceil(this.sa.min_work_time / this.sa.funct_round) * this.sa.funct_round : this.sa.funct_round; // LCM of min_work_time and funct_round
        this.assign_day_of_week = this.sa.assignment_date.getDay();
        if (this.sa.break_days.length) {
            this.mods = this.calcModDays();
        }
        this.skew_ratio_lim = this.calcSkewRatioLim();
        if (this.sa.skew_ratio > this.skew_ratio_lim) {
            this.sa.skew_ratio = this.skew_ratio_lim;
        } else if (this.sa.skew_ratio < 2 - this.skew_ratio_lim) {
            this.sa.skew_ratio = 2 - this.skew_ratio_lim;
        }
        this.unit_is_of_time = ["minute", "hour"].includes(pluralize(this.sa.unit, 1).toLowerCase());
    }
    calcSkewRatioLim() {
        const y1 = this.sa.y - this.red_line_start_y;
        if (!y1) return 0;
        let x1 = this.sa.x - this.red_line_start_x;
        if (this.sa.break_days.length) {
            x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + this.mods[x1 % 7];
        }
        /*
        skew_ratio = (a + b) * x1 / y1; 
        skew_ratio = this.funct(1) * x1 / y1;
        skew_ratio = (y1+min_work_time_funct_round) * x1 / y1;
        */
        return Math.round((y1 + this.min_work_time_funct_round) * x1 / y1 * 10)/10;
    }
}
class VisualAssignment extends Assignment {
    constructor(dom_assignment) {
        super(dom_assignment);
        this.dom_assignment = dom_assignment;
        this.zoom = 1;
        this.graph = dom_assignment.find(".graph");
        this.fixed_graph = dom_assignment.find(".fixed-graph");
        this.graph.css({
            width: this.zoom*100+"%",
            height: this.zoom*100+"%",
        });
        this.fixed_graph.css({
            width: this.zoom*100+"%",
            height: this.zoom*100+"%",
        });
        this.set_skew_ratio_using_graph = false;
        this.draw_mouse_point = true;
        this.due_date = new Date(this.sa.assignment_date.valueOf());
        this.due_date.setDate(this.due_date.getDate() + this.sa.x);
        if (this.sa.assignment_date.getFullYear() === this.due_date.getFullYear()) {
            this.date_string_options = {month: 'long', day: 'numeric', weekday: 'long'};
            this.date_string_options_no_weekday = {month: 'long', day: 'numeric'};
        } else {
            this.date_string_options = {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'};
            this.date_string_options_no_weekday = {year: 'numeric', month: 'long', day: 'numeric'};
        }
        this.today_minus_ad = utils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
        this.dom_assignment.find(".skew-ratio-textbox").attr({
            min: 1 - this.skew_ratio_lim,
            max: this.skew_ratio_lim - 1,
        });
        this.scale = window.devicePixelRatio || 2;
        this.scale *= this.zoom;
    }
    calcSkewRatioLimVisually() {
        const skew_ratio_lim = super.calcSkewRatioLim();
        this.dom_assignment.find(".skew-ratio-textbox").attr({
            min: 1 - skew_ratio_lim,
            max: skew_ratio_lim - 1,
        });
        return skew_ratio_lim;
    }
    resize() {
        // If date_now changes, redefine variables dependent on them
        // If so, works may also change because of autofill in priority.js
        this.today_minus_ad = utils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
        if (!this.sa.fixed_mode) {
            // Use sa because dynamic_start is changed in priority.js
            this.red_line_start_x = this.sa.dynamic_start;
            this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
            if (this.sa.break_days.length) {
                this.mods = this.calcModDays();
            }
            this.skew_ratio_lim = this.calcSkewRatioLim();
            this.setParabolaValues();
        }
        if (this.dom_assignment.hasClass("open-assignment") && this.dom_assignment.is(":visible")) {
            // Static properties
            this.width = this.fixed_graph.width();
            this.height = this.fixed_graph.height();
            if (this.width > 500) {
                VisualAssignment.font_size = 13.9;
            } else {
                VisualAssignment.font_size = Math.round((this.width + 450) / 47 * 0.6875);
            }
            this.wCon = (this.width - 55) / this.sa.x;
            this.hCon = (this.height - 55) / this.sa.y;
            this.graph[0].width = this.width * this.scale;
            this.graph[0].height = this.height * this.scale;
            this.fixed_graph[0].width = this.width * this.scale;
            this.fixed_graph[0].height = this.height * this.scale;
            this.drawfixed();
            this.draw();
            // this.graph[0].width *= this.zoom;
            // this.graph[0].height *= this.zoom;
            // this.fixed_graph[0].width *= this.zoom;
            // this.fixed_graph[0].height *= this.zoom;
        }
    }
    mousemove(e) {
        const raw_x = e.pageX - this.fixed_graph.offset().left;
        const raw_y = e.pageY - this.fixed_graph.offset().top;
        // If set skew ratio is enabled, make the third point (x2,y2)
        if (this.set_skew_ratio_using_graph) {
            let x1 = this.sa.x - this.red_line_start_x;
            const y1 = this.sa.y - this.red_line_start_y;
            if (this.sa.break_days.length) {
                x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + this.mods[x1 % 7];
            }
            // (x2,y2) are the raw coordinates of the graoh
            // This converts the raw coordinates to graph coordinates, which match the steps on the x and y axes
            let x2 = (raw_x - 50.1) / this.wCon - this.red_line_start_x;
            const y2 = (this.height - raw_y - 48.7) / this.hCon - this.red_line_start_y;
            // Handles break days
            if (this.sa.break_days.length) {
                const floorx2 = Math.floor(x2);
                if (this.sa.break_days.includes((this.assign_day_of_week + floorx2 + this.red_line_start_x) % 7)) {
                    x2 = floorx2;
                }
                x2 -= Math.floor(x2 / 7) * this.sa.break_days.length + this.mods[floorx2 % 7];
            }
            // If the mouse is outside the graph to the left or right, ignore it
            // NOTE: x2 can be NaN from being outside of the graph caused by negative indexing by floorx2. Doesn't matter if this happens
            if (0 < x2 & x2 < x1) {
                // If the parabola is being set by the graph, connect (0,0), (x1,y1), (x2,y2)
                // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                this.a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
                this.b = (y1 - x1 * x1 * this.a) / x1;

                // Redefine skew ratio
                this.sa.skew_ratio = (this.a + this.b) * x1 / y1;
                // Cap skew ratio
                if (this.sa.skew_ratio > this.skew_ratio_lim) {
                    this.sa.skew_ratio = this.skew_ratio_lim;
                } else if (this.sa.skew_ratio < 2 - this.skew_ratio_lim) {
                    this.sa.skew_ratio = 2 - this.skew_ratio_lim;
                } else if (Math.abs(Math.round(this.sa.skew_ratio) - this.sa.skew_ratio) < 0.05) {
                    // Snap skew ratio to whole numbers
                    this.sa.skew_ratio = Math.round(this.sa.skew_ratio);
                    // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                    this.a = y1 * (1 - this.sa.skew_ratio) / ((x1 - 1) * x1);
                    this.b = (y1 - x1 * x1 * this.a) / x1;
                }
            }
        }
        // Passes mouse x and y coords so mouse point can be drawn
        this.draw(raw_x, raw_y);
    }
    static preventArrowScroll(e) {
        // Prevent arrow keys from scrolling when clicking the up or down arrows in the graph
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    }
    changeSkewRatio() {
        // Change skew ratio by +- 0.1 and cap it
        if (this.pressed_arrow_key === "ArrowDown") {
            this.sa.skew_ratio = utils.precisionRound(this.sa.skew_ratio - 0.1, 1);
            if (this.sa.skew_ratio < 2 - this.skew_ratio_lim) {
                this.sa.skew_ratio = this.skew_ratio_lim;
            }
        } else {
            this.sa.skew_ratio = utils.precisionRound(this.sa.skew_ratio + 0.1, 1);
            if (this.sa.skew_ratio > this.skew_ratio_lim) {
                this.sa.skew_ratio = 2 - this.skew_ratio_lim;
            }
        }
        this.setParabolaValues();
        // Save skew ratio and draw
        this.old_skew_ratio = this.sa.skew_ratio;
        ajaxUtils.SendAttributeAjaxWithTimeout('skew_ratio', this.sa.skew_ratio, this.sa.id);
        priority.sort();
        this.draw();
    }
    draw(raw_x, raw_y) {
        const len_works = this.sa.works.length - 1;
        const last_work_input = this.sa.works[len_works];
        // && raw_x && raw_y is needed because resize() can call draw() while draw_mouse_point is true but not pass any mouse coordinates, from for example resizing the browser
        if (this.draw_mouse_point && raw_x && raw_y) {
            // -50.1 and -48.7 were used instead of -50 because I experimented those to be the optimal positions of the graph coordinates
            var mouse_x = Math.round((raw_x - 50.1) / this.wCon),
                mouse_y = (this.height - raw_y - 48.7) / this.hCon;
            if (mouse_x < Math.min(this.red_line_start_x, this.sa.blue_line_start)) {
                mouse_x = Math.min(this.red_line_start_x, this.sa.blue_line_start);
            } else if (mouse_x > this.sa.x) {
                mouse_x = this.sa.x;
            }
            if (this.sa.blue_line_start <= mouse_x && mouse_x <= len_works + this.sa.blue_line_start) {
                if (mouse_x < this.red_line_start_x) {
                    mouse_y = true;
                } else {
                    mouse_y = Math.abs(mouse_y - this.funct(mouse_x)) > Math.abs(mouse_y - this.sa.works[mouse_x - this.sa.blue_line_start]);
                }
            } else {
                mouse_y = false;
            }
            if (!this.set_skew_ratio_using_graph && this.last_mouse_x === mouse_x && this.last_mouse_y === mouse_y) return;
            this.last_mouse_x = mouse_x;
            this.last_mouse_y = mouse_y;
        }
        // draw() always runs setParabolaValues but I'll leave it like this because it'll require a lot of maintence
        this.setParabolaValues();
        const screen = this.graph[0].getContext("2d");
        screen.scale(this.scale, this.scale);
        screen.clearRect(0, 0, this.width, this.height);
        let move_info_down,
            todo = this.funct(len_works+this.sa.blue_line_start+1);
        if (show_progress_bar) {
            move_info_down = 0;
            let should_be_done_x = this.width - 155 + todo / this.sa.y * 146,
                bar_move_left = should_be_done_x - this.width + 17;
            if (bar_move_left < 0 || this.sa.x <= this.today_minus_ad || last_work_input >= this.sa.y) {
                bar_move_left = 0
            } else if (should_be_done_x > this.width - 8) {
                bar_move_left = this.width - 8;
            }
            // bar move left
            screen.fillStyle = "rgb(55,55,55)";
            screen.fillRect(this.width-155-bar_move_left, this.height-121,148,50);
            screen.fillStyle = "lime";
            screen.fillRect(this.width-153-bar_move_left, this.height-119,144,46);

            screen.fillStyle = "rgb(0,128,0)";
            const slash_x = this.width - 142 - bar_move_left;
            screen.beginPath();
            screen.moveTo(slash_x,this.height-119);
            screen.lineTo(slash_x+15,this.height-119);
            screen.lineTo(slash_x+52.5,this.height-73);
            screen.lineTo(slash_x+37.5,this.height-73);
            screen.fill();
            screen.beginPath();
            screen.moveTo(slash_x+35,this.height-119);
            screen.lineTo(slash_x+50,this.height-119);
            screen.lineTo(slash_x+87.5,this.height-73);
            screen.lineTo(slash_x+72.5,this.height-73);
            screen.fill();
            screen.beginPath();
            screen.moveTo(slash_x+70,this.height-119);
            screen.lineTo(slash_x+85,this.height-119);
            screen.lineTo(slash_x+122.5,this.height-73);
            screen.lineTo(slash_x+107.5,this.height-73);
            screen.fill();

            screen.textAlign = "center";
            screen.fillStyle = "black";
            screen.font = '13.75px Open Sans';
            screen.textBaseline = "top";
            if (this.sa.x > this.today_minus_ad && last_work_input < this.sa.y) {
                screen.fillText(`Your Progress: ${Math.floor(last_work_input/this.sa.y*100)}%`, this.width-81, this.height-68);
                const done_x = this.width-153+last_work_input/this.sa.y*144-bar_move_left;
                screen.fillStyle = "white";
                screen.fillRect(done_x, this.height-119, this.width-9-bar_move_left-done_x, 46);
                if (should_be_done_x >= this.width - 153) {
                    screen.fillStyle = "black";
                    if (should_be_done_x > this.width - 17) {
                        should_be_done_x = this.width - 17;
                    }
                    screen.rotate(Math.PI / 2);
                    // Since rotate, swap x and y, make x negative
                    screen.fillText("Goal", this.height-95, -should_be_done_x-14);
                    screen.rotate(-Math.PI / 2);
                    screen.fillStyle = "rgb(55,55,55)";
                    screen.fillRect(should_be_done_x, this.height-119, 2, 46);
                }
            } else {
                screen.fillText("Completed!", this.width-81-bar_move_left, this.height-68);
            }
        } else {
            move_info_down = 72;
        }
        let radius = this.wCon / 3;
        if (radius > 3) {
            radius = 3;
        } else if (radius < 2) {
            radius = 2;
        }
        let circle_x,
            circle_y,
            line_end = this.sa.x + Math.ceil(1 / this.wCon);
        screen.strokeStyle = "rgb(233,68,46)"; // red
        screen.lineWidth = radius;
        screen.beginPath();
        for (let point = this.red_line_start_x; point < line_end; point += Math.ceil(1 / this.wCon)) {
            circle_x = point * this.wCon + 50;
            if (circle_x > this.width - 5) {
                circle_x = this.width - 5;
            }
            circle_y = this.height - this.funct(point) * this.hCon - 50;
            screen.lineTo(circle_x - (point === this.red_line_start_x) * radius / 2, circle_y); // (point===0)*radius/2 makes sure the first point is filled in properly
            screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
            screen.moveTo(circle_x, circle_y);
        }
        screen.stroke();
        screen.beginPath();
        radius *= 0.75;
        if (len_works + Math.ceil(1 / this.wCon) < line_end) {
            line_end = len_works + Math.ceil(1 / this.wCon);
        }
        screen.strokeStyle = "rgb(1,147,255)"; // blue
        screen.lineWidth = radius;
        for (let point = 0; point < line_end; point += Math.ceil(1 / this.wCon)) {
            circle_x = (point + this.sa.blue_line_start) * this.wCon + 50;
            if (point > len_works) {
                circle_y = this.height - this.sa.works[len_works] * this.hCon - 50;
            } else {
                circle_y = this.height - this.sa.works[point] * this.hCon - 50;
            }
            screen.lineTo(circle_x - (point === 0) * radius / 2, circle_y);
            screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
            screen.moveTo(circle_x, circle_y);
        }
        radius /= 0.75;
        screen.stroke();
        screen.textBaseline = "top";
        screen.textAlign = "start";
        screen.font = VisualAssignment.font_size + 'px Open Sans';
        if (this.draw_mouse_point && raw_x && raw_y) {
            let funct_mouse_x;
            if (mouse_y) {
                funct_mouse_x = this.sa.works[mouse_x - this.sa.blue_line_start];
            } else {
                funct_mouse_x = this.funct(mouse_x);
            }
            let str_mouse_x = new Date(this.sa.assignment_date);
            str_mouse_x.setDate(str_mouse_x.getDate() + mouse_x);
            str_mouse_x = str_mouse_x.toLocaleDateString("en-US", this.date_string_options_no_weekday);
            if (this.wCon * mouse_x + 50 + screen.measureText(`(Day: ${str_mouse_x}, ${pluralize(this.sa.unit,1)}: ${funct_mouse_x})`).width > this.width - 5) {
                screen.textAlign = "end";
            }
            if (this.height - funct_mouse_x * this.hCon - 50 + screen.measureText(0).width * 2 > this.height - 50) {
                screen.textBaseline = "bottom";
            }
            screen.fillStyle = "black";
            screen.fillText(` (Day: ${str_mouse_x}, ${pluralize(this.sa.unit,1)}: ${funct_mouse_x}) `, this.wCon * mouse_x + 50, this.height - funct_mouse_x * this.hCon - 50);
            screen.fillStyle = "lime";
            screen.strokeStyle = "lime";
            screen.beginPath();
            screen.arc(this.wCon * mouse_x + 50, this.height - funct_mouse_x * this.hCon - 50, radius, 0, 2 * Math.PI);
            screen.stroke();
            screen.fill();
            screen.fillStyle = "black";
        }
        const rounded_skew_ratio = Math.round((this.sa.skew_ratio-1)*1000)/1000;
        screen.textAlign = "end";
        screen.fillStyle = "black";
        screen.textBaseline = "top";
        screen.font = '13.75px Open Sans';
        screen.fillText(this.sa.fixed_mode ? "Fixed Mode" : "Dynamic Mode", this.width-2, this.height-155+move_info_down);
        screen.fillText(`Skew Ratio: ${rounded_skew_ratio} (${rounded_skew_ratio ? "Parabolic" : "Linear"})`, this.width-2, this.height-138+move_info_down);

        const daysleft = this.sa.x - this.today_minus_ad;
        let strdaysleft = '';
        if (daysleft < -1) {
            strdaysleft = ` (${-daysleft} Days Ago)`;
        } else {
            switch (daysleft) {
                case -1:
                    strdaysleft = " (Yesterday)";
                    break
                case 0:
                    strdaysleft = " (Today)";
                    break;
                case 1:
                    strdaysleft = " (Tomorrow)";
                    break;
            }
        }
        screen.textAlign = "center";
        screen.textBaseline = "bottom";
        screen.font = VisualAssignment.font_size + 'px Open Sans';
        const row_height = screen.measureText(0).width * 2;
        const center = (str, y_pos) => screen.fillText(str, 50+(this.width-50)/2, row_height*y_pos);
        center(`Due Date: ${this.due_date.toLocaleDateString("en-US", this.date_string_options)}${strdaysleft}`, 1);
        if (last_work_input < this.sa.y) {
            todo -= last_work_input;
            if (todo < 0 || this.sa.break_days.includes((this.assign_day_of_week+this.sa.blue_line_start+len_works) % 7)) {
                todo = 0;
            }
            let displayed_day = new Date(this.sa.assignment_date.valueOf());
            displayed_day.setDate(displayed_day.getDate() + this.sa.blue_line_start + len_works);
            const distance_today_from_displayed_day = this.today_minus_ad - this.sa.blue_line_start - len_works;
            let str_day = displayed_day.toLocaleDateString("en-US", this.date_string_options);
            switch (distance_today_from_displayed_day) {
                case -1:
                    str_day += ' (Tomorrow)';
                    break;
                case 0:
                    str_day += ' (Today)';
                    break;
                case 1:
                    str_day += ' (Yesterday)';
                    break;
            }
            str_day += ':';
            center(str_day, 3);
            center(`Goal for ${displayed_day.valueOf() === date_now.valueOf() ? "Today" : "this Day"}: ${last_work_input + todo}/${this.sa.y} ${pluralize(this.sa.unit)}`, 4);
            if (this.today_minus_ad < 0) {
                center("This Assignment has Not Yet been Assigned", 6);
            } else if (distance_today_from_displayed_day > 0) {
                center("You haven't Entered your Work from Previous Days", 6);
                center("Please Enter your Progress to Continue", 7);
            } else if (this.sa.break_days.includes((this.assign_day_of_week+this.sa.blue_line_start+len_works) % 7) || displayed_day.valueOf() > date_now.valueOf()) {
                center("You have Completed your Work for Today", 6);
            }
        } else {
            center('You are Completely Finished with this Assignment!', 5);
        }
        screen.scale(1 / this.scale, 1 / this.scale);
    }
    drawfixed() {
        const screen = this.fixed_graph[0].getContext("2d");
        screen.scale(this.scale, this.scale);
        let gradient = screen.createLinearGradient(0, 0, 0, this.height * 4 / 3);
        gradient.addColorStop(0, "white");
        gradient.addColorStop(1, "lightgray");
        screen.fillStyle = gradient;
        screen.fillRect(0, 0, this.width, this.height * 4 / 3);

        // x and y axis rectangles
        screen.fillStyle = "rgb(185,185,185)";
        screen.fillRect(40, 0, 10, this.height);
        screen.fillRect(0, this.height - 50, this.width, 10);

        // x axis label
        screen.fillStyle = "black";
        screen.textAlign = "center";
        screen.font = '17.1875px Open Sans';
        screen.fillText("Days", (this.width - 50) / 2 + 50, this.height - 5);

        // y axis label
        screen.rotate(Math.PI / 2);
        if (this.unit_is_of_time) {
            const plural = pluralize(this.sa.unit);
            var text = `${plural[0].toUpperCase() + plural.substring(1).toLowerCase()} of Work`,
                label_x_pos = -2;
        } else {
            var text = `${pluralize(this.sa.unit)} (${utils.formatting.formatMinutes(this.sa.ctime)} per ${pluralize(this.sa.unit,1)})`,
                label_x_pos = -5;
        }
        if (screen.measureText(text).width > this.height - 50) {
            text = pluralize(this.sa.unit);
        }
        screen.fillText(text, (this.height - 50) / 2, label_x_pos);
        screen.rotate(-Math.PI / 2);

        screen.font = '13.75px Open Sans';
        screen.textBaseline = "top";
        const x_axis_scale = Math.pow(10, Math.floor(Math.log10(this.sa.x))) * Math.ceil(this.sa.x.toString()[0] / Math.ceil((this.width - 100) / 100));
        if (this.sa.x >= 10) {
            gradient = screen.createLinearGradient(0, 0, 0, this.height * 4 / 3);
            gradient.addColorStop(0, "gainsboro");
            gradient.addColorStop(1, "silver");
            const small_x_axis_scale = x_axis_scale / 5,
                label_index = screen.measureText(Math.floor(this.sa.x)).width * 1.25 < small_x_axis_scale * this.wCon;
            for (let smaller_index = 1; smaller_index <= Math.floor(this.sa.x / small_x_axis_scale); smaller_index++) {
                if (smaller_index % 5) {
                    const displayed_number = smaller_index * small_x_axis_scale;
                    screen.fillStyle = gradient; // Line color
                    screen.fillRect(displayed_number * this.wCon + 48.5, 0, 2, this.height - 50); // Draws line index
                    screen.fillStyle = "rgb(80,80,80)"; // Number color
                    if (label_index) {
                        const numberwidth = screen.measureText(displayed_number).width;
                        let number_x_pos = displayed_number * this.wCon + 50;
                        if (number_x_pos + numberwidth / 2 > this.width - 1) {
                            number_x_pos = this.width - numberwidth / 2 - 1;
                        }
                        screen.fillText(displayed_number, number_x_pos, this.height - 39);
                    }
                }
            }
        }

        screen.textBaseline = "alphabetic";
        screen.textAlign = "right";
        const y_axis_scale = Math.pow(10, Math.floor(Math.log10(this.sa.y))) * Math.ceil(this.sa.y.toString()[0] / Math.ceil((this.height - 100) / 100));
        let font_size2 = 16.90625 - Math.ceil(this.sa.y - this.sa.y % y_axis_scale).toString().length * 1.71875;
        if (this.sa.y >= 10) {
            const small_y_axis_scale = y_axis_scale / 5;
            if (font_size2 < 8.5) {
                font_size2 = 8.5;
            }
            screen.font = font_size2 + 'px Open Sans';
            const text_height = screen.measureText(0).width * 2,
                label_index = text_height < small_y_axis_scale * this.hCon;
            for (let smaller_index = 1; smaller_index <= Math.floor(this.sa.y / small_y_axis_scale); smaller_index++) {
                const displayed_number = smaller_index * small_y_axis_scale;
                if (smaller_index % 5) {
                    const gradient_percent = 1 - (displayed_number * this.hCon) / (this.height - 50);
                    screen.fillStyle = `rgb(${220-16*gradient_percent},${220-16*gradient_percent},${220-16*gradient_percent})`;
                    screen.fillRect(50, this.height - 51.5 - displayed_number * this.hCon, this.width - 50, 2);
                    screen.fillStyle = "rgb(80,80,80)";
                    if (label_index) {
                        let number_y_pos = this.height - displayed_number * this.hCon - 54 + text_height / 2;
                        if (number_y_pos < 4 + text_height / 2) {
                            number_y_pos = 4 + text_height / 2;
                        }
                        if (38.5 - screen.measureText(displayed_number).width < 13 - label_x_pos) {
                            screen.textAlign = "left";
                            screen.fillText(displayed_number, 13 - label_x_pos, number_y_pos);
                            screen.textAlign = "right";
                        } else {
                            screen.fillText(displayed_number, 38.5, number_y_pos);
                        }
                    }
                }
            }
        }
        font_size2 *= 1.2;
        screen.font = font_size2 + 'px Open Sans';
        const text_height = screen.measureText(0).width * 2;
        for (let bigger_index = Math.ceil(this.sa.y - this.sa.y % y_axis_scale); bigger_index > 0; bigger_index -= y_axis_scale) {
            if (bigger_index * 2 < y_axis_scale) {
                break;
            }
            screen.fillStyle = "rgb(205,205,205)";
            screen.fillRect(50, this.height - bigger_index * this.hCon - 52.5, this.width - 50, 5);
            screen.fillStyle = "black";
            let number_y_pos = this.height - bigger_index * this.hCon - 54 + text_height / 2;
            if (number_y_pos < 4 + text_height / 2) {
                number_y_pos = 4 + text_height / 2;
            }
            if (38.5 - screen.measureText(bigger_index).width < 13 - label_x_pos) {
                screen.textAlign = "left";
                screen.fillText(bigger_index, 13 - label_x_pos, number_y_pos);
                screen.textAlign = "right";
            } else {
                screen.fillText(bigger_index, 38.5, number_y_pos);
            }
        }
        screen.fillText(0, 39, this.height - 52);

        screen.textBaseline = "top";
        screen.textAlign = "center";
        screen.font = '16.5px Open Sans';
        for (let bigger_index = Math.ceil(this.sa.x - this.sa.x % x_axis_scale); bigger_index > 0; bigger_index -= x_axis_scale) {
            screen.fillStyle = "rgb(205,205,205)";
            screen.fillRect(bigger_index * this.wCon + 47.5, 0, 5, this.height - 50);
            screen.fillStyle = "black";
            const numberwidth = screen.measureText(bigger_index).width;
            let number_x_pos = bigger_index * this.wCon + 50;
            if (number_x_pos + numberwidth / 2 > this.width - 1) {
                number_x_pos = this.width - numberwidth / 2 - 1;
            }
            screen.fillText(bigger_index, number_x_pos, this.height - 39);
        }
        screen.fillText(0, 55.5, this.height - 38.5);
        if (this.today_minus_ad > -1 && this.today_minus_ad <= this.sa.x) {
            let today_x = this.today_minus_ad*this.wCon+47.5;
            screen.fillStyle = "rgb(150,150,150)";
            screen.fillRect(today_x, 0, 5, this.height-50);
            screen.fillStyle = "black";
            screen.rotate(Math.PI / 2);
            screen.textAlign = "center";
            screen.textBaseline = "middle";
            screen.font = '17.1875px Open Sans';
            if (today_x > this.width - 12.5) {
                today_x = this.width - 12.5;
            }
            screen.fillText("Today Line", (this.height-50)/2, -today_x-2.5);
            screen.rotate(-Math.PI / 2);
        }
    }
    setAssignmentEventListeners() {
        const skew_ratio_button = this.dom_assignment.find(".skew-ratio-button"),
                work_input_button = this.dom_assignment.find(".work-input-button"),
                display_button = this.dom_assignment.find(".display-button"),
                skew_ratio_textbox = this.dom_assignment.find(".skew-ratio-textbox"),
                submit_work_button = this.dom_assignment.find(".submit-work-button"),
                ignore_assignment_button = this.dom_assignment.find(".mark-as-finished-button"),
                fixed_mode_button = this.dom_assignment.find(".fixed-mode-button"),
                delete_work_input_button = this.dom_assignment.find(".delete-work-input-button"),
                next_assignment_button = this.dom_assignment.find(".next-assignment-button");
        this.graph.off("mousemove").mousemove(this.mousemove.bind(this)); // Turn off mousemove to ensure there is only one mousemove handler at a time
        $(window).resize(this.resize.bind(this));

        // BEGIN Up and down arrow event handler
        let graphtimeout,
            fired = false, // $(document).keydown( fires for every frame a key is held down. This makes it behaves like it fires once
            graphinterval;
        $(document).keydown(e => {
            // fixed_graph.is(":visible") to make sure it doesnt change when the assignment is closed
            if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.shiftKey && this.fixed_graph.is(":visible")) {
                const rect = this.fixed_graph[0].getBoundingClientRect();
                // Makes sure graph is on screen
                if (rect.bottom - rect.height / 1.5 > 70 && rect.y + rect.height / 1.5 < window.innerHeight && !fired) {
                    // "fired" makes .keydown fire only when a key is pressed, not repeatedly
                    fired = true;
                    this.pressed_arrow_key = e.key;
                    this.changeSkewRatio();
                    graphtimeout = setTimeout(function() {
                        clearInterval(graphinterval);
                        graphinterval = setInterval(this.changeSkewRatio.bind(this), 13);
                    }, 500);
                }
            }
        }).keyup(e => {
            // Ensures the same key pressed fires the keyup to stop change skew ratio
            // Without this, you could press another key while the down arrow is being pressed for example and stop graphinterval
            if (e.key === this.pressed_arrow_key) {
                fired = false;
                clearTimeout(graphtimeout);
                clearInterval(graphinterval);
            }
        });
        // END Up and down arrow event handler

        // BEGIN Delete work input button
        let not_applicable_timeout_delete_work_input_button;
        delete_work_input_button.click(() => {
            let len_works = this.sa.works.length - 1;
            if (!len_works) {
                delete_work_input_button.html("Nothing to Delete");
                clearTimeout(not_applicable_timeout_delete_work_input_button);
                not_applicable_timeout_delete_work_input_button = setTimeout(function() {
                    delete_work_input_button.html("Delete Work Input");
                }, 1000);
                return;
            }
            this.sa.works.pop();
            len_works--;

            // If the deleted work input cut the dynamic start, run this
            // Reverses the logic of work inputs in and recursively decreases red_line_start_x
            if (this.red_line_start_x > len_works + this.sa.blue_line_start) {
                // The outer for loop decrements red_line_start_x if the inner for loop didn't break
                outer: 
                for (this.red_line_start_x = this.red_line_start_x - 2; this.red_line_start_x >= this.sa.blue_line_start; this.red_line_start_x--) {
                    this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                    if (this.sa.break_days.length) {
                        this.mods = this.calcModDays();
                    }
                    this.skew_ratio_lim = this.calcSkewRatioLimVisually();
                    this.setParabolaValues();
                    // The inner for loop checks if every work input is the same as the red line for all work inputs greater than red_line_start_x
                    let next_funct = this.funct(this.red_line_start_x),
                        next_work = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                    for (let i = this.red_line_start_x; i < len_works + this.sa.blue_line_start; i++) {
                        const this_funct = next_funct,
                            this_work = next_work;
                        next_funct = this.funct(i + 1),
                        next_work = this.sa.works[i - this.sa.blue_line_start + 1];
                        // When a day is found where the work input isn't the same as the red line for that red_line_start_x, break and then increase it by 1 to where it doesnt happen
                        if (next_funct - this_funct !== next_work - this_work) {
                            break outer;
                        }
                    }
                }
                // ++ for three cases:
                // if for loop doesnt run, do ++ to fix red_line_start_x
                // if for loop finds, do ++ because current red_line_start_x has the work input that isnt the same as todo
                // if for loop doesnt find, do ++; red_line_start_x is less than blue_line_start which is illegal
                this.red_line_start_x++;
                this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                if (this.sa.break_days.length) {
                    this.mods = this.calcModDays();
                }
                this.skew_ratio_lim = this.calcSkewRatioLimVisually();
                this.sa.dynamic_start = this.red_line_start_x;
                ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", this.sa.dynamic_start, this.sa.id)
            }
            ajaxUtils.SendAttributeAjaxWithTimeout("works", this.sa.works.map(String), this.sa.id);
            priority.sort({do_not_autofill: true}); // Don't autofill on delete work input because it'll just undo the delete in some cases
            this.draw();
        });
        // END Delete work input button

        // BEGIN Submit work button
        let not_applicable_timeout_submit_work_button;
        submit_work_button.click(() => {
            let len_works = this.sa.works.length - 1;
            let last_work_input = this.sa.works[len_works];

            let not_applicable_message;
            if (!work_input_button.val()) {
                not_applicable_message = "Enter a Value";
            } else if (last_work_input >= this.sa.y) {
                not_applicable_message = "Already Finished";
            } else if (this.today_minus_ad < this.sa.blue_line_start) {
                not_applicable_message = "Not Yet Assigned";
            }
            let todo = this.funct(len_works + this.sa.blue_line_start + 1) - last_work_input;
            let input_done = work_input_button.val().trim().toLowerCase();
            switch (input_done) {
                case "fin":
                    input_done = todo;
                    break;
                default: {
                    input_done = +input_done;
                    if (isNaN(input_done)) {
                        not_applicable_message = "Invalid Value";
                    }
                }
            }
            if (len_works + this.sa.blue_line_start === this.sa.x - 1 && input_done + last_work_input < this.sa.y) {
                not_applicable_message = "Last work input must finish this assignment";
            }
            if (not_applicable_message) {
                submit_work_button.html(not_applicable_message);
                clearTimeout(not_applicable_timeout_submit_work_button);
                not_applicable_timeout_submit_work_button = setTimeout(function() {
                    submit_work_button.html("Submit Work Input");
                }, 1000);
                return;
            }
            if (input_done + last_work_input < 0) {
                input_done = -last_work_input;
            }
            this.sa.works.push(input_done + last_work_input);
            // last_work_input += input_done; No point in redefining last_work_input since it's not used from here
            len_works++;
            if (this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + len_works) % 7)) {
                todo = 0;
            }
            if (input_done !== todo) {
                if (len_works + this.sa.blue_line_start === this.sa.x) {
                    this.sa.dynamic_start = len_works + this.sa.blue_line_start - 1; // If users enter a value >y on the last day dont change dynamic start
                } else {
                    this.sa.dynamic_start = len_works + this.sa.blue_line_start;
                }
                ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", this.sa.dynamic_start, this.sa.id);
                if (!this.sa.fixed_mode) {
                    this.red_line_start_x = this.sa.dynamic_start;
                    this.red_line_start_y = this.sa.works[this.sa.dynamic_start - this.sa.blue_line_start];
                    if (this.sa.break_days.length) {
                        this.mods = this.calcModDays();
                    }
                    this.skew_ratio_lim = this.calcSkewRatioLimVisually();
                    this.setParabolaValues();
                }
            }
            ajaxUtils.SendAttributeAjaxWithTimeout("works", this.sa.works.map(String), this.sa.id);
            priority.sort();
            this.draw();
        });
        // END Submit work button

        // BEGIN Display button
        display_button.click(() => {
            $.alert({title: "This feature has not yet been implented"});
        }).css("text-decoration", "line-through");
        // END Display button

        // BEGIN ignore button
        let not_applicable_timeout_ignore_assignment_button;
        ignore_assignment_button.click(() => {
            if (this.dom_assignment.parents(".assignment-container").hasClass("question-mark")) {
                ignore_assignment_button.html("Not Applicable");
                clearTimeout(not_applicable_timeout_ignore_assignment_button);
                not_applicable_timeout_ignore_assignment_button = setTimeout(function() {
                    ignore_assignment_button.html("Ignore for Today only");
                }, 1000);
                return;
            }
            this.sa.mark_as_done = !this.sa.mark_as_done;
            ignore_assignment_button.onlyText(this.sa.mark_as_done ? "Unignore for Today" : "Ignore for Today only");
            ajaxUtils.SendAttributeAjaxWithTimeout('mark_as_done', this.sa.mark_as_done, this.sa.id);
            priority.sort({ ignore_timeout: true });
        }).html(this.sa.mark_as_done ? "Unignore for Today" : "Ignore for Today only");
        // END ignore button

        // BEGIN Next assignment button
        let not_applicable_timeout_next_assignment_button;
        next_assignment_button.click(() => {
            const next_assignment = this.dom_assignment.parents(".assignment-container").next().children(".assignment");
            if (!next_assignment.length) {
                next_assignment.html("No More Assignments");
                clearTimeout(not_applicable_timeout_next_assignment_button);
                not_applicable_timeout_next_assignment_button = setTimeout(function() {
                    next_assignment.html("Next Assignment");
                }, 1000);
                return;
            }
            if (!next_assignment.hasClass("open-assignment")) {  
                this.dom_assignment[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                this.dom_assignment.click();
                next_assignment.click();
            }
        });
        // END Next assignment button

        // BEGIN Set skew ratio using graph button
        const _this = this;
        function cancel_set_skew_ratio_using_graph() {
            skew_ratio_button.onlyText("Set skew ratio using graph");
            _this.set_skew_ratio_using_graph = false;
            _this.sa.skew_ratio = old_skew_ratio;
            _this.draw();
            // No need to ajax since skew ratio is the same
        }
        let not_applicable_timeout_skew_ratio_button;
        skew_ratio_button.click(() => {
            let x1 = this.sa.x - this.red_line_start_x;
            if (this.sa.break_days.length) {
                x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + this.mods[x1 % 7];
            }
            if (x1 <= 1) {
                skew_ratio_button.onlyText("Not Applicable");
                clearTimeout(not_applicable_timeout_skew_ratio_button);
                not_applicable_timeout_skew_ratio_button = setTimeout(function() {
                    skew_ratio_button.onlyText("Set Skew Ratio using Graph");
                }, 1000);
                return;
            }
            skew_ratio_button.onlyText("(Click again to cancel)").one("click", cancel_set_skew_ratio_using_graph);
            // Turn off mousemove to ensure there is only one mousemove handler at a time
            this.graph.off("mousemove").mousemove(this.mousemove.bind(this));
            this.set_skew_ratio_using_graph = true;
        });
        let old_skew_ratio = this.sa.skew_ratio; // Old skew ratio is the old original value of the skew ratio if the user decides to cancel
        this.graph.click(e => {
            if (this.set_skew_ratio_using_graph) {
                // Runs if (set_skew_ratio_using_graph && draw_mouse_point || set_skew_ratio_using_graph && !draw_mouse_point)
                this.set_skew_ratio_using_graph = false;
                // stop set skew ratio if canvas is clicked
                skew_ratio_button.onlyText("Set skew ratio using graph").off("click", cancel_set_skew_ratio_using_graph);
                old_skew_ratio = this.sa.skew_ratio;
                ajaxUtils.SendAttributeAjaxWithTimeout('skew_ratio', this.sa.skew_ratio, this.sa.id);
                // Disable mousemove if only skew ratio is running
                if (!this.draw_mouse_point) {
                    this.graph.off("mousemove");
                }
                priority.sort({ ignore_timeout: true });
                this.draw();
            } else if (this.draw_mouse_point) {
                if (!isMobile) {
                    // Runs if (!set_skew_ratio_using_graph && draw_mouse_point) and not on mobile
                    // Disable draw point
                    this.graph.off("mousemove");
                    this.draw_mouse_point = false;
                    delete this.last_mouse_x;
                    this.draw();
                }
            } else {
                // Runs if (!set_skew_ratio_using_graph && !draw_mouse_point)
                // Enable draw point
                this.draw_mouse_point = true;
                // Turn off mousemove to ensure there is only one mousemove handler at a time
                this.graph.off("mousemove").mousemove(this.mousemove.bind(this));
                // Pass in e because $.trigger makes e.pageX undefined
                this.mousemove(e);
            }
        });
        // END Set skew ratio button using graph button

        // BEGIN Skew ratio textbox
        let not_applicable_timeout_skew_ratio_textbox;
        skew_ratio_textbox.on("keydown paste click keyup", () => { // keydown for normal sr and keyup for delete
            if (old_skew_ratio === undefined) {
                // Sets old_skew_ratio
                old_skew_ratio = this.sa.skew_ratio;
            }
            let x1 = this.sa.x - this.red_line_start_x;
            if (this.sa.break_days.length) {
                x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + this.mods[x1 % 7];
            }
            if (x1 <= 1) {
                skew_ratio_textbox.val('').attr("placeholder", "Not Applicable");
                clearTimeout(not_applicable_timeout_skew_ratio_textbox);
                not_applicable_timeout_skew_ratio_textbox = setTimeout(function() {
                    skew_ratio_textbox.attr("placeholder", "Enter Skew Ratio");
                }, 1000);
                return;
            }
            if (skew_ratio_textbox.val()) {
                // Sets and caps skew ratio
                // The skew ratio in the code is 1 more than the displayed skew ratio
                this.sa.skew_ratio = +skew_ratio_textbox.val() + 1;
                if (this.sa.skew_ratio > this.skew_ratio_lim) {
                    this.sa.skew_ratio = 2 - this.skew_ratio_lim;
                } else if (this.sa.skew_ratio < 2 - this.skew_ratio_lim) {
                    this.sa.skew_ratio = this.skew_ratio_lim;
                }
            } else {
                // Reset skew ratio to old value if blank
                this.sa.skew_ratio = old_skew_ratio;
                old_skew_ratio = undefined;
            }
            this.draw();
        }).keypress(e => {
            // Saves skew ratio on enter
            if (e.key === "Enter") {
                // Also triggers below
                skew_ratio_textbox.blur();
            }
        }).focusout(() => {
            skew_ratio_textbox.val('');
            if (old_skew_ratio !== undefined) {
                // Save skew ratio
                old_skew_ratio = this.sa.skew_ratio;
                ajaxUtils.SendAttributeAjaxWithTimeout('skew_ratio', this.sa.skew_ratio, this.sa.id);
            }
            // Update old skew ratio
            old_skew_ratio = this.sa.skew_ratio;
            priority.sort({ ignore_timeout: true });
        });
        // END Skew ratio textbox

        // BEGIN Fixed/dynamic mode button
        fixed_mode_button.click(() => {
            this.sa.fixed_mode = !this.sa.fixed_mode;
            fixed_mode_button.onlyText(this.sa.fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
            ajaxUtils.SendAttributeAjaxWithTimeout('fixed_mode', this.sa.fixed_mode, this.sa.id);
            if (this.sa.fixed_mode) {
                // Set start of red line and setParabolaValues()
                this.red_line_start_x = 0;
                this.red_line_start_y = 0;
                this.setParabolaValues();
            } else {
                this.red_line_start_x = this.sa.dynamic_start;
                this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                // No need to setParabolaValues()
            }
            if (this.sa.break_days.length) {
                this.mods = this.calcModDays();
            }
            priority.sort({ ignore_timeout: true });
            this.draw();
        }).html(this.sa.fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
        // END Fixed/dynamic mode button        
    }
    addAssignmentInfoButtons() {
        const skew_ratio_button = this.dom_assignment.find(".skew-ratio-button"),
                work_input_button = this.dom_assignment.find(".work-input-button"),
                skew_ratio_textbox = this.dom_assignment.find(".skew-ratio-textbox"),
                fixed_mode_button = this.dom_assignment.find(".fixed-mode-button");
        skew_ratio_button.info("top", 
            `The skew ratio determines the work distribution of the graph

            Click this button and hover and click the graph`
        ).css("margin-right", 1);

        work_input_button.info("top",
            `Enter the number of units done on the graph's displayed date and submit
            
            Keyword: enter "fin" if you've completed an assignment's work for its displayed date`,"after"
        ).css({
            left: "calc(50% + 47px)",
            top: 3,
            position: "absolute",
        });

        fixed_mode_button.info("top",
            `Fixed mode:
            The red line always starts at the assignment date, meaning if you don't finish a day's work, you'll have to make it up on the next day

            Dynamic mode (default):
            If you don't finish a day's work, the red line will readjust itself and adapt to your work schedule`, "prepend"
        ).css("left", -3);

        skew_ratio_textbox.info("top", 
            `The skew ratio determines the work distribution of the graph

            Enter this as a number. Leave this blank to cancel or press enter to save`,'after'
        ).css({
            left: "calc(50% + 56px)",
            bottom: 37,
            position: "absolute",
        // Initially hide or show this if "Advanced Options" is visible or not
        // Only need to do this here because this info button is absolutely positioned
        }).toggle(this.dom_assignment.find(".second-advanced-button").is(":visible"));
    }
}
$(function() {
$(".assignment").click(function(e) {
    if (!$(e.target).is(".status-message, .right-side-of-header, .align-to-status-message-container, .assignment, .assignment-header, .status-image, .arrow-container, polygon, .title, .tags, .tag-wrapper, .tag-name")) return;
    const dom_assignment = $(this);
    const sa_used_to_check_to_shake = utils.loadAssignmentData(dom_assignment);
    let assignment_to_shake;
    // If the assignment is marked as completed but marked as completed isn't enabled, it must have been marked because of break days, an incomplete work schedule, or needs more information
    if (dom_assignment.hasClass("mark-as-done") && !sa_used_to_check_to_shake.mark_as_done) {
        assignment_to_shake = $(".assignment").first().focus();
    } else if (sa_used_to_check_to_shake.needs_more_info) {
        assignment_to_shake = dom_assignment;
        dom_assignment.find(".update-button").parents(".button").focus();
    }
    if (assignment_to_shake) {
        assignment_to_shake.animate({left: -5}, 75, "easeOutCubic", function() {
            assignment_to_shake.animate({left: 5}, 75, "easeOutCubic", function() {
                assignment_to_shake.animate({left: 0}, 75, "easeOutCubic");
            });
        });
        return;
    }
    const first_click = !dom_assignment.hasClass('has-been-clicked');
    dom_assignment.addClass("has-been-clicked");
    const assignment_footer = dom_assignment.find(".assignment-footer");
    // Close assignment
    if (dom_assignment.hasClass("open-assignment")) {
        // Animate the graph's margin bottom to close the assignment and make the graph's overflow hidden
        assignment_footer.animate({
            marginBottom: -(assignment_footer.height() + 5)
        }, 750, "easeOutCubic", function() {
            // Hide graph when transition ends
            dom_assignment.css("overflow", "");
            assignment_footer.css({
                display: "",
                marginBottom: "",
            });
        });
        dom_assignment.find(".falling-arrow-animation")[0].beginElement();
        dom_assignment.removeClass("open-assignment").css("overflow", "hidden");
        // If no graphs are open, allow arrow scroll
        if ($(".open-assignment").length === 0) {
            $(document).off("keydown", VisualAssignment.preventArrowScroll);
        }
        return;
    }
    const sa = new VisualAssignment(dom_assignment);
    // If the assignment was clicked while it was closing, stop the closing animation and open it
    assignment_footer.stop().css({
        display: "",
        marginBottom: "",
    });
    dom_assignment.css("overflow", "");
    // Prevents auto scroll if a graph is open
    if ($(".open-assignment").length === 0) {
        $(document).keydown(VisualAssignment.preventArrowScroll);
    }
    assignment_footer.css("display", "block");
    dom_assignment.addClass("open-assignment");
    dom_assignment.find(".rising-arrow-animation")[0].beginElement();
    // Sets event handlers only on the assignment's first click
    if (first_click) {
        sa.setAssignmentEventListeners();
        sa.addAssignmentInfoButtons();
    }
    sa.resize();
    if (enable_tutorial) {
        $(".assignment").next().remove(); // Remove "Click this assignment"
        setTimeout(function() {
            const days_until_due = sa.sa.x-sa.sa.blue_line_start;
            utils.ui.graphAlertTutorial(days_until_due);
        }, 200);
    }
});
});