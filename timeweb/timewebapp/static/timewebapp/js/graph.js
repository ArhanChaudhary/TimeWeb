// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Assignment {
    constructor(dom_assignment) {
        this.sa = utils.loadAssignmentData(dom_assignment);
        this.assign_day_of_week = this.sa.assignment_date?.getDay();
        this.red_line_start_x = this.sa.fixed_mode ? 0 : this.sa.dynamic_start; // X-coordinate of the start of the red line
        this.red_line_start_y = this.sa.fixed_mode ? 0 : this.sa.works[this.red_line_start_x - this.sa.blue_line_start]; // Y-coordinate of the start of the red line
        if (!Number.isFinite(this.red_line_start_x) || !Number.isFinite(this.red_line_start_y)) {
            this.red_line_start_x = undefined;
            this.red_line_start_y = undefined;
        }
        this.min_work_time_funct_round = this.sa.min_work_time ? Math.ceil(this.sa.min_work_time / this.sa.funct_round) * this.sa.funct_round : this.sa.funct_round; // LCM of min_work_time and funct_round
        if (this.sa.unit) this.unit_is_of_time = ["minute", "hour"].includes(pluralize(this.sa.unit, 1).toLowerCase());
    }
    calcSkewRatioBound() {
        let x1 = this.sa.x;
        let y1 = this.sa.y;
        if (!y1) return 0;

        // this isn't always accurate with due times but i dont think anyone in the entire universe could care less; its 2 am and im tired and i just want to get an A on my physics exam im sorry but i realized after wasting like half an hour trying to find a goddamn solution that no user using timeweb will *ever* care at all that the skew ratio doesnt flatten out completely using arrow keys, in fact which users will even know that arrow keys exist, who the hell also cares about timeweb enough to actually use it, what am i doing with my life
        const mods = this.calcModDays();
        x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + mods[x1 % 7];
        /*
        skew_ratio = (a + b) * x1 / y1; 
        skew_ratio = this.funct(1) * x1 / y1;
        skew_ratio = (y1+min_work_time_funct_round) * x1 / y1;
        */
        const skew_ratio_bound = mathUtils.precisionRound((y1 + this.min_work_time_funct_round) * x1 / y1, 10);
        return skew_ratio_bound;
    }
    setDynamicStartIfInDynamicMode(params={ ajax: true }) {
        if (!this.sa.fixed_mode) {
            const old_dynamic_start = this.sa.dynamic_start;
            const len_works = this.sa.works.length - 1;

            let low = this.sa.blue_line_start;
            let high = len_works + this.sa.blue_line_start;// - (len_works + this.sa.blue_line_start === this.sa.x); // If users enter a value >y on the last day dont change dynamic start because the graph may display info for the day after the due date; however this doesn't happen because the assignment is completed
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                this.red_line_start_x = mid;
                this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                this.setParabolaValues();

                let valid_red_line_start_x = true;
                // The inner for loop checks if every work input is the same as the red line for all work inputs greater than red_line_start_x
                let next_funct = this.funct(this.red_line_start_x),
                    next_work = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                for (let i = this.red_line_start_x; i < len_works + this.sa.blue_line_start; i++) {
                    const this_funct = next_funct,
                        this_work = next_work;
                    next_funct = this.funct(i + 1),
                    next_work = this.sa.works[i - this.sa.blue_line_start + 1];
                    if (next_funct - this_funct !== next_work - this_work) {
                        valid_red_line_start_x = false;
                        break;
                    }
                }
                if (valid_red_line_start_x) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
            this.red_line_start_x = low;
            this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
            this.sa.dynamic_start = this.red_line_start_x;

            // !this.sa.needs_more_info probably isn't needed but just in case as a safety mechanism for priority.js
            params.ajax && !this.sa.needs_more_info && old_dynamic_start !== this.sa.dynamic_start && ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", this.sa.dynamic_start, this.sa.id);
        }
        // We still need to setParabolaValues() in fixed mode
        // some functions (such as mousemove()) assume the parabola is reset when this is called, which does not happen in fixed mode if i were to simply use a guard clause
        this.setParabolaValues();
    }
    // make sure to properly set red_line_start_x before running this function
    incrementDueDate() {
        this.sa.due_time = {hour: 0, minute: 0};
        do {
            this.sa.x++;
        } while (this.getWorkingDaysRemaining({ reference: "blue line end" }) === 0);
        this.sa.complete_x = this.sa.x;
        ajaxUtils.sendAttributeAjaxWithTimeout("due_time", this.sa.due_time, this.sa.id);

        const due_date = new Date(this.sa.assignment_date.valueOf());
        due_date.setDate(due_date.getDate() + this.sa.x);
        ajaxUtils.sendAttributeAjaxWithTimeout("x", due_date.getTime()/1000, this.sa.id);

        this.sa.alert_due_date_incremented = true;
        ajaxUtils.sendAttributeAjaxWithTimeout("alert_due_date_incremented", this.sa.alert_due_date_incremented, this.sa.id);
    }
    getWorkingDaysRemaining(params={reference: null, floor_due_time: false}) {
        const original_red_line_start_x = this.red_line_start_x;
        switch (params.reference) {
            case "today":
                let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
                this.red_line_start_x = today_minus_assignment_date;
                break;
            case "blue line end": {
                let len_works = this.sa.works.length - 1;
                this.red_line_start_x = this.sa.blue_line_start + len_works;
                break;
            }
            case "visual red line start": {
                let len_works = this.sa.works.length - 1;
                // First point the red line is drawn on, taken from draw()
                this.red_line_start_x = this.sa.fixed_mode ? 0 : this.sa.blue_line_start + len_works;
                break;
            }
        }
        if (params.floor_due_time) {
            var x1 = Math.floor(this.sa.complete_x) - this.red_line_start_x;
        } else {
            var x1 = this.sa.x - this.red_line_start_x;
        }
        // note: this returns NaN when x1 is negative

        const mods = this.calcModDays();
        // dont apply the ceiling logic on other instances of this code because x1 will anyways always be an integer
        x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + mods[x1 % 7];

        this.red_line_start_x = original_red_line_start_x;
        return x1;
    }
}
class VisualAssignment extends Assignment {
    static CLOSE_ASSIGNMENT_TRANSITION_DURATION = 750 * SETTINGS.animation_speed
    static MOUSE_POSITION_TRANSFORM = {x: 0.1, y: -1.3} // Adjusts the mouse position by a few pixels to make it visually more accurate
    static RED_LINE_COLOR = {r: 233, g: 68, b: 46}
    static BLUE_LINE_COLOR = {r: 1, g: 147, b: 255}
    static MINIMUM_CIRCLE_Y = -1000
    static SKEW_RATIO_ROUND_PRECISION = 3
    static SKEW_RATIO_SNAP_DIFF = 0.05
    static ARROW_KEYDOWN_THRESHOLD = 500
    static ARROW_KEYDOWN_INTERVAL = 13
    static BUTTON_ERROR_DISPLAY_TIME = 1000
    static TOTAL_ARROW_SKEW_RATIO_STEPS = 100

    constructor(dom_assignment) {
        super(dom_assignment);
        this.dom_assignment = dom_assignment;
        this.graph = dom_assignment.find(".graph");
        this.fixed_graph = dom_assignment.find(".fixed-graph");
        this.set_skew_ratio_using_graph = false;
        this.draw_mouse_point = true;
        this.complete_due_date = new Date(this.sa.assignment_date.valueOf());
        this.complete_due_date.setDate(this.complete_due_date.getDate() + Math.floor(this.sa.complete_x));
        if (this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)) {
            this.complete_due_date.setMinutes(this.complete_due_date.getMinutes() + this.sa.due_time.hour * 60 + this.sa.due_time.minute);
        }
        if (this.sa.assignment_date.getFullYear() === this.complete_due_date.getFullYear()) {
            this.date_string_options = {month: 'long', day: 'numeric', weekday: 'long'};
            this.date_string_options_no_weekday = {month: 'long', day: 'numeric'};
        } else {
            this.date_string_options = {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'};
            this.date_string_options_no_weekday = {year: 'numeric', month: 'long', day: 'numeric'};
        }
        this.scale = window.devicePixelRatio || 2;
    }
    resize() {
        if (!this.sa.fixed_mode) {
            // Use sa because dynamic_start is changed in priority.js; needed to redefine starts
            this.red_line_start_x = this.sa.dynamic_start;
            this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
            this.setParabolaValues();
        }
        this.scale = window.devicePixelRatio || 2; // Zoom in/out
        const assignment_footer = this.dom_assignment.find(".assignment-footer");
        if (assignment_footer.is(":visible")) {
            this.width = this.fixed_graph.width();
            this.height = this.fixed_graph.height();
        } else {
            assignment_footer.show();
            this.width = this.fixed_graph.width();
            this.height = this.fixed_graph.height();
            assignment_footer.hide();
        }
        //hard
        if (this.width > 500) {
            VisualAssignment.font_size = 13.9;
        } else {
            VisualAssignment.font_size = Math.round((this.width + 450) / 47 * 0.6875);
        }
        this.wCon = (this.width - 55) / this.sa.complete_x;
        this.hCon = (this.height - 55) / this.sa.y;
        this.graph[0].width = this.width * this.scale;
        this.graph[0].height = this.height * this.scale;
        this.fixed_graph[0].width = this.width * this.scale;
        this.fixed_graph[0].height = this.height * this.scale;
        if (this.dom_assignment.hasClass("open-assignment") || this.dom_assignment.hasClass("assignment-is-closing")) {
            this.drawFixed();
            this.draw();
            const hover_point_label = this.dom_assignment.find(".hover-point-label");
            hover_point_label.addClass("hide-label");
        }
    }
    mousemove(e, iteration_number=1) {
        const raw_x = e.pageX - this.fixed_graph.offset().left;
        const raw_y = e.pageY - this.fixed_graph.offset().top;
        // If set skew ratio is enabled, make the third point (x2,y2)
        if (this.set_skew_ratio_using_graph && iteration_number !== Assignment.AUTOTUNE_ITERATIONS + 1) {
            let x1 = this.sa.complete_x - this.red_line_start_x;
            let y1 = this.sa.y - this.red_line_start_y;

            const mods = this.calcModDays();
            x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
            if (this.sa.break_days.includes(this.assign_day_of_week + Math.floor(this.sa.complete_x))) {
                x1 = Math.ceil(x1);
            }

            // (x2,y2) are the raw coordinates of the graoh
            // This converts the raw coordinates to graph coordinates, which match the steps on the x and y axes
            let x2 = (raw_x - (50 + VisualAssignment.MOUSE_POSITION_TRANSFORM.x)) / this.wCon - this.red_line_start_x;
            let y2 = (this.height - raw_y - (50 + VisualAssignment.MOUSE_POSITION_TRANSFORM.y)) / this.hCon - this.red_line_start_y - (this.sa.y - this.red_line_start_y) % this.sa.funct_round;

            // i don't think ceiling logic is needed here because it seems to work as intended without it
            const floorx2 = Math.floor(x2);
            if (this.sa.break_days.includes((this.assign_day_of_week + floorx2 + this.red_line_start_x) % 7)) {
                x2 = floorx2;
            }
            x2 -= Math.floor(x2 / 7) * this.sa.break_days.length + mods[floorx2 % 7];

            const skew_ratio_bound = this.calcSkewRatioBound();
            // If the mouse is outside the graph to the left or right, ignore it
            // x2 can be NaN from being outside of the graph caused by negative indexing by floorx2. Doesn't matter if this happens
            if (0 < x2 && x2 < x1) {
                // If the parabola is being set by the graph, connect (0,0), (x1,y1), (x2,y2)
                const parabola = this.calcAandBfromOriginAndTwoPoints([x2, y2], [x1, y1]);
                this.a = parabola.a;
                this.b = parabola.b;
                
                // Redefine skew ratio
                this.sa.skew_ratio = mathUtils.clamp(2 - skew_ratio_bound, (this.a + this.b) * x1 / y1, skew_ratio_bound);
                if (Math.abs(Math.round(this.sa.skew_ratio) - this.sa.skew_ratio) < VisualAssignment.SKEW_RATIO_SNAP_DIFF) {
                    // Snap skew ratio to whole numbers
                    this.sa.skew_ratio = Math.round(this.sa.skew_ratio);
                }
            } else if (0 >= x2) {
                this.sa.skew_ratio = skew_ratio_bound;
            } else if (x2 >= x1) {
                this.sa.skew_ratio = 2 - skew_ratio_bound;
            }
            this.setDynamicStartIfInDynamicMode({ ajax: false });
            this.mousemove(e, iteration_number + 1);
        } else {
            // Passes mouse x and y coords so mouse point can be drawn
            this.draw(raw_x, raw_y);
        }
    }
    arrowSkewRatio() {
        /**
         * Line: y = ax + b
         * y1 = y - this.red_line_start_y
         * x1 = (complete_x - this.red_line_start_x)
         * y = x(y1/x1)
         * inverse:
         * y = y1-x(y1/x1)
         * inverse it:
         * 
         * Parabola: y = ax^2 + bx
         * y = ax^2 + bx
         * 
         * Solve for x:
         * y1-x(y1/x1) = ax^2 + bx
         * 0 = ax^2 + xb - x(y1)/(x1) - y1
         * 0 = ax^2 + (y1/x1 - b)x - y1
         * a = a
         * b = b + y1/x1
         * c = -y1
         * result = (-b +- Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
         * result = (-(y1/x1 - b) +- Math.sqrt(Math.pow(y1/x1 - b, 2) - (4 * a * -y1))) / (2 * a);
         * by playing with this https://www.desmos.com/calculator/urjcy3zcua we can see to always use plus
         */
        let x1 = this.sa.complete_x - this.red_line_start_x;
        let y1 = this.sa.y - this.red_line_start_y;

        const mods = this.calcModDays();
        x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
        if (this.sa.break_days.includes(this.assign_day_of_week + Math.floor(this.sa.complete_x))) {
            x1 = Math.ceil(x1);
        }

        let a = this.a;
        let b = this.b + y1/x1;
        let c = -y1;
        if (a)
            var intersection_x = (-b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
        else
            // y = y1 - x(y1/x1)
            // y = (y1/x1)x
            // (y1/x1)x = y1 - x(y1/x1)
            // 2 x y1 = y1 x1
            // 2 x = x1
            // x = x1 / 2
            var intersection_x = x1 / 2;

        let x_step = x1 / VisualAssignment.TOTAL_ARROW_SKEW_RATIO_STEPS;
        intersection_x = x_step * Math.round(intersection_x / x_step);
        if (this.pressed_arrow_key === "ArrowUp")
            var next_intersection_x = intersection_x - x_step;
        else if (this.pressed_arrow_key === "ArrowDown")
            var next_intersection_x = intersection_x + x_step;
        
        // plug in next_intersection_x as x into y = y1 - x(y1/x1)
        let next_intersection = [next_intersection_x, y1 - next_intersection_x * y1/x1];
        let parabola = this.calcAandBfromOriginAndTwoPoints(next_intersection, [x1, y1]);

        const original_skew_ratio = this.sa.skew_ratio;
        this.sa.skew_ratio = (parabola.a + parabola.b) * x1 / y1;

        const skew_ratio_bound = this.calcSkewRatioBound();
        // use original_skew_ratio to allow one more arrow before bound so the parabols completely flattens
        // add && or else holding down will cause themselves to trigger each other in an infinite loop
        if ((original_skew_ratio >= skew_ratio_bound || next_intersection_x === 0) && this.pressed_arrow_key === "ArrowUp") {
            this.sa.skew_ratio = 2 - skew_ratio_bound;
        } else if ((original_skew_ratio <= 2 - skew_ratio_bound || next_intersection_x === x1) && this.pressed_arrow_key === "ArrowDown") {
            this.sa.skew_ratio = skew_ratio_bound;
        }

        this.setDynamicStartIfInDynamicMode();
        ajaxUtils.sendAttributeAjaxWithTimeout('skew_ratio', this.sa.skew_ratio, this.sa.id);
        new Priority().sort({ timeout: true });
        this.draw();
    }
    static getCanvasFont = font_size => `${$("body").css("font-weight")} ${font_size}px Open Sans`;
    //hard (this entire function)
    draw(raw_x, raw_y) {
        const len_works = this.sa.works.length - 1;
        const last_work_input = this.sa.works[len_works];
        const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
        const assignment_container = this.dom_assignment.parents(".assignment-container");
        // Number.isFinite(raw_x) && Number.isFinite(raw_y) is needed because resize() can call draw() while draw_mouse_point is true but not pass any mouse coordinates, from for example resizing the browser
        if (this.draw_mouse_point && Number.isFinite(raw_x) && Number.isFinite(raw_y)) {
            var mouse_x = (raw_x - (50 + VisualAssignment.MOUSE_POSITION_TRANSFORM.x)) / this.wCon,
                mouse_y = (this.height - raw_y - (50 + VisualAssignment.MOUSE_POSITION_TRANSFORM.y)) / this.hCon;
            if (mouse_x >= (Math.round(mouse_x) + this.sa.complete_x) / 2)
                mouse_x = this.sa.x;
            else
                mouse_x = Math.round(mouse_x);
            if (mouse_x < Math.min(this.red_line_start_x, this.sa.blue_line_start))
                mouse_x = Math.min(this.red_line_start_x, this.sa.blue_line_start);
            else if (mouse_x > this.sa.x)
                mouse_x = this.sa.x;
            if (this.sa.blue_line_start <= mouse_x && mouse_x <= len_works + this.sa.blue_line_start) {
                if (Math.ceil(mouse_x) < this.red_line_start_x) {
                    mouse_y = true;
                } else {
                    mouse_y = Math.abs(mouse_y - this.funct(mouse_x)) > Math.abs(mouse_y - this.sa.works[mouse_x - this.sa.blue_line_start]);
                }
            } else {
                mouse_y = false;
            }
            if (!this.set_skew_ratio_using_graph && this.last_mouse_x === mouse_x && this.last_mouse_y === mouse_y) {
                return;
            }
            if (mouse_y) {
                var funct_mouse_x = this.sa.works[mouse_x - this.sa.blue_line_start];
            } else {
                var funct_mouse_x = this.funct(mouse_x);
            }
            this.last_mouse_x = mouse_x;
            this.last_mouse_y = mouse_y;
        }
        // draw() always runs setParabolaValues but I'll leave it like this because it'll require a lot of maintence
        
        this.setParabolaValues();
        const screen = this.graph[0].getContext("2d");
        screen.scale(this.scale, this.scale);
        screen.clearRect(0, 0, this.width, this.height);

        const rounded_skew_ratio = mathUtils.precisionRound(this.sa.skew_ratio - 1, VisualAssignment.SKEW_RATIO_ROUND_PRECISION);
        screen.textAlign = "end";
        screen.fillStyle = SETTINGS.dark_mode ? "white" : "black";
        screen.textBaseline = "top";
        screen.font = VisualAssignment.getCanvasFont(13.75);
        if (!this.sa.needs_more_info) {
            screen.fillText(`Curvature: ${rounded_skew_ratio}${rounded_skew_ratio ? "" : " (Linear)"}`, this.width-2, this.height-155+72);
            screen.fillText(this.sa.fixed_mode ? "Fixed Mode" : "Dynamic Mode", this.width-2, this.height-138+72);
        }
        let radius = this.wCon / 3;
        if (radius > 3) {
            radius = 3;
        } else if (radius < 2) {
            radius = 2;
        }

        let circle_x,
            circle_y,
            line_end = this.sa.complete_x + Math.ceil(1 / this.wCon);
        screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.RED_LINE_COLOR, { invert: $("html").is("#dark-mode") });
        screen.lineWidth = radius;
        screen.beginPath();
        for (let point_x = (this.sa.fixed_mode || DEBUG) ? this.red_line_start_x : this.sa.blue_line_start + len_works; point_x < line_end; point_x += Math.ceil(1 / this.wCon)) {
            let point_y = this.funct(point_x);
            circle_x = point_x * this.wCon + 50;
            if (circle_x > this.width - 5) {
                circle_x = this.width - 5;
            }
            circle_y = Math.max(VisualAssignment.MINIMUM_CIRCLE_Y, this.height - point_y * this.hCon - 50);
            screen.lineTo(circle_x - (point_x === this.red_line_start_x) * radius / 2, circle_y); // (point_x === this.red_line_start_x) * radius / 2 makes sure the first point is filled in properly
            screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI)
            screen.moveTo(circle_x, circle_y);
        }
        screen.stroke();
        screen.beginPath();
        radius *= 0.75;
        line_end = Math.min(line_end, len_works + Math.ceil(1 / this.wCon));
        screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.BLUE_LINE_COLOR, { invert: $("html").is("#dark-mode") });
        screen.lineWidth = radius;
        for (let point_x = 0; point_x < line_end; point_x += Math.ceil(1 / this.wCon)) {
            let point_y = this.sa.works[Math.min(len_works, point_x)];
            circle_x = Math.min(this.sa.complete_x, point_x + this.sa.blue_line_start) * this.wCon + 50;
            circle_y = Math.max(VisualAssignment.MINIMUM_CIRCLE_Y, this.height - point_y * this.hCon - 50);
            
            screen.lineTo(circle_x - (point_x === 0) * radius / 2, circle_y);
            screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
            screen.moveTo(circle_x, circle_y);
        }
        radius /= 0.75;
        screen.stroke();
        screen.font = VisualAssignment.getCanvasFont(VisualAssignment.font_size);
        if (this.draw_mouse_point && Number.isFinite(raw_x) && Number.isFinite(raw_y) && !this.sa.needs_more_info) {
            let str_mouse_x;
            if (mouse_x === this.sa.x && this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)) {
                str_mouse_x = new Date(this.complete_due_date.valueOf());
                str_mouse_x = str_mouse_x.toLocaleDateString("en-US", {...this.date_string_options_no_weekday, hour: "numeric", minute: "numeric"});
                // mouse_x as a variable isnt needed anymore. Set it to complete_x if at x to position the point
                mouse_x = this.sa.complete_x;
            } else {
                str_mouse_x = new Date(this.sa.assignment_date.valueOf());
                str_mouse_x.setDate(str_mouse_x.getDate() + mouse_x);
                str_mouse_x = str_mouse_x.toLocaleDateString("en-US", this.date_string_options_no_weekday);
            }
            const point_x = mouse_x * this.wCon + 50;
            const point_y = Math.max(VisualAssignment.MINIMUM_CIRCLE_Y, this.height - funct_mouse_x * this.hCon - 50);
            const point_str = `(Day: ${str_mouse_x}, ${pluralize(this.sa.unit,1)}: ${funct_mouse_x})`;
            const hover_point_label = this.dom_assignment.find(".hover-point-label");
            if (hover_point_label.hasClass("initial-position")) {
                hover_point_label.addClass("disable-hover-point-label-transition");
            }
            hover_point_label.removeClass("hide-label");
            hover_point_label.prop("style").setProperty("--x", point_x);
            hover_point_label.prop("style").setProperty("--y", point_y);
            hover_point_label.text(point_str);
            hover_point_label.toggleClass("move-left", point_x + screen.measureText(point_str).width > this.width - 5);
            if (hover_point_label.hasClass("initial-position")) {
                hover_point_label[0].offsetHeight;
                hover_point_label.removeClass("disable-hover-point-label-transition initial-position");
            }
            screen.beginPath();

            if (this.sa.works[mouse_x - this.sa.blue_line_start] === funct_mouse_x) {
                screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.BLUE_LINE_COLOR, { invert: $("html").is("#dark-mode") });
            } else if (this.funct(mouse_x) === funct_mouse_x) {
                screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.RED_LINE_COLOR, { invert: $("html").is("#dark-mode") });
            }
            
            screen.fillStyle = "white";
            screen.arc(point_x, point_y, radius + 2, 0, 2 * Math.PI);
            screen.fill();
            screen.lineWidth = 2;
            screen.stroke();
            screen.fillStyle = "black";
        }
        
        screen.textAlign = "center";
        screen.textBaseline = "bottom";
        screen.font = VisualAssignment.getCanvasFont(VisualAssignment.font_size);
        const row_height = screen.measureText(0).width * 2;
        const center = (str, y_pos) => screen.fillText(str, 50+(this.width-50)/2, row_height*y_pos);
        if (!assignment_container.hasClass("finished") && !this.sa.needs_more_info) {
            let displayed_day;
            let str_day;
            if (this.sa.blue_line_start + len_works === this.sa.x && this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)) {
                displayed_day = new Date(this.complete_due_date.valueOf());
                str_day = displayed_day.toLocaleDateString("en-US", {...this.date_string_options, hour: "numeric", minute: "numeric"});
            } else {
                displayed_day = new Date(this.sa.assignment_date.valueOf());
                displayed_day.setDate(displayed_day.getDate() + this.sa.blue_line_start + len_works);
                str_day = displayed_day.toLocaleDateString("en-US", this.date_string_options);
            }
            const distance_today_from_displayed_day = today_minus_assignment_date - this.sa.blue_line_start - len_works;
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

            let todo = mathUtils.precisionRound(this.funct(len_works + this.sa.blue_line_start + 1) - last_work_input, 10);
            if (todo < 0 || this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + len_works) % 7)) {
                todo = 0;
            }

            if (displayed_day.valueOf() !== date_now.valueOf()) {
                center(str_day, 1);
                center(`${pluralize(this.sa.unit, 2)} to Complete for this Day: ${todo} (${utils.formatting.formatMinutes(todo * this.sa.time_per_unit)})`, 2);
            }
        }
        screen.scale(1 / this.scale, 1 / this.scale);
    }
    //hard (the entire function)
    drawFixed() {
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
        screen.font = VisualAssignment.getCanvasFont(17.1875);
        screen.fillText("Days", this.width / 2, this.height - 5);

        // y axis label
        if (this.sa.unit) {
            screen.rotate(-Math.PI / 2);
            if (this.unit_is_of_time) {
                const plural = pluralize(this.sa.unit);
                var text = `${plural[0].toUpperCase() + plural.substring(1).toLowerCase()} of Work`;
            } else {
                var text = `${pluralize(this.sa.unit)} (${utils.formatting.formatMinutes(this.sa.time_per_unit)} per ${pluralize(this.sa.unit,1)})`;
            }
            if (screen.measureText(text).width > this.height - 50) {
                text = pluralize(this.sa.unit);
            }
            screen.textBaseline = "hanging";
            screen.fillText(text, -(this.height - 50) / 2, 0);
            screen.rotate(Math.PI / 2);
        }

        screen.font = VisualAssignment.getCanvasFont(13.75);
        screen.textBaseline = "top";
        const x_axis_scale = Math.pow(10, Math.floor(Math.log10(this.sa.complete_x))) * Math.ceil(this.sa.complete_x.toString()[0] / Math.ceil((this.width - 100) / 100));
        if (this.sa.complete_x >= 10) {
            gradient = screen.createLinearGradient(0, 0, 0, this.height * 4 / 3);
            gradient.addColorStop(0, "gainsboro");
            gradient.addColorStop(1, "silver");
            const small_x_axis_scale = x_axis_scale / 5,
                label_index = screen.measureText(Math.floor(this.sa.complete_x)).width * 1.25 < small_x_axis_scale * this.wCon;
            for (let smaller_index = 1; smaller_index <= Math.floor(this.sa.complete_x / small_x_axis_scale); smaller_index++) {
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
        if (!this.sa.needs_more_info) {
            const y_axis_scale = Math.pow(10, Math.floor(Math.log10(this.sa.y))) * Math.ceil(this.sa.y.toString()[0] / Math.ceil((this.height - 100) / 100));
            let font_size2 = 16.90625 - Math.ceil(this.sa.y - this.sa.y % y_axis_scale).toString().length * 1.71875;
            if (this.sa.y >= 10) {
                const small_y_axis_scale = y_axis_scale / 5;
                if (font_size2 < 8.5) {
                    font_size2 = 8.5;
                }
                screen.font = VisualAssignment.getCanvasFont(font_size2);
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
                            if (38.5 - screen.measureText(displayed_number).width < 13) {
                                screen.textAlign = "left";
                                screen.fillText(displayed_number, 13, number_y_pos);
                                screen.textAlign = "right";
                            } else {
                                screen.fillText(displayed_number, 38.5, number_y_pos);
                            }
                        }
                    }
                }
            }
            font_size2 *= 1.2;
            screen.font = VisualAssignment.getCanvasFont(font_size2);
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
                if (38.5 - screen.measureText(bigger_index).width < 13) {
                    screen.textAlign = "left";
                    screen.fillText(bigger_index, 13, number_y_pos);
                    screen.textAlign = "right";
                } else {
                    screen.fillText(bigger_index, 38.5, number_y_pos);
                }
            }
        }
        screen.fillText(0, 39, this.height - 52);

        screen.textBaseline = "top";
        screen.textAlign = "center";
        screen.font = VisualAssignment.getCanvasFont(16.5);
        for (let bigger_index = Math.ceil(this.sa.complete_x - this.sa.complete_x % x_axis_scale); bigger_index > 0; bigger_index -= x_axis_scale) {
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
        const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(utils.getRawDateNow(), this.sa.assignment_date, {round: false});
        if (today_minus_assignment_date > -1 && today_minus_assignment_date <= this.sa.complete_x) {
            let today_x = today_minus_assignment_date * this.wCon + 47.5;
            screen.fillStyle = "rgb(150,150,150)";
            screen.fillRect(today_x, 0, 5, this.height - 50);
            screen.fillStyle = "black";
            screen.rotate(Math.PI / 2);
            screen.textAlign = "center";
            screen.textBaseline = "middle";
            screen.font = VisualAssignment.getCanvasFont(17.1875);
            if (today_x > this.width - 12.5) {
                today_x = this.width - 12.5;
            }
            screen.fillText("Today Line", (this.height - 50)/2, -today_x - 2.5);
            screen.rotate(-Math.PI / 2);
        }
    }
    assignmentGraphIsOnScreen() {
        const rect = this.fixed_graph[0].getBoundingClientRect();
        // Makes sure graph is on screen
        return rect.bottom - rect.height / 1.5 > 70 && rect.y + rect.height / 1.5 < window.innerHeight;
    }
    static IDGeneratorCounter = 0
    static notApplicableTimeouts = {}
    static flashNotApplicable($graph_button) {
        
        switch ($graph_button.prop("tagName").toLowerCase()) {
            case "button":
                var original_text = $graph_button.text();
                $graph_button.text("Not Applicable");
                break;
            case "input":
                var original_text = $graph_button.attr("placeholder");
                $graph_button.val("").attr("placeholder", "Not Applicable");
                break;
        }
        if ($graph_button.hasClass("is-flashing")) return;
        $graph_button.addClass("is-flashing");
        
        clearTimeout(VisualAssignment.notApplicableTimeouts[VisualAssignment.getGraphButtonID($graph_button)]);
        VisualAssignment.notApplicableTimeouts[VisualAssignment.getGraphButtonID($graph_button)] = setTimeout(() => {
            $graph_button.removeClass("is-flashing");
            switch ($graph_button.prop("tagName").toLowerCase()) {
                case "button":
                    $graph_button.text(original_text);
                    break;
                case "input":
                    $graph_button.attr("placeholder", original_text);
                    break;
            }
        }, VisualAssignment.BUTTON_ERROR_DISPLAY_TIME);
    }
    static getGraphButtonID($graph_button) {
        if (!$graph_button.attr("data-timeout-id")) $graph_button.attr("data-timeout-id", ++VisualAssignment.IDGeneratorCounter);
        return $graph_button.attr("data-timeout-id");
    }
    setGraphButtonEventListeners() {
        // might be easier to set the clicks to $(document) but will do later
        const skew_ratio_button = this.dom_assignment.find(".skew-ratio-button"),
                work_input_textbox = this.dom_assignment.find(".work-input-textbox"),
                submit_work_button = this.dom_assignment.find(".submit-work-button"),
                fixed_mode_button = this.dom_assignment.find(".fixed-mode-button"),
                hide_assignment_button = this.dom_assignment.find(".hide-assignment-button"),
                delete_work_input_button = this.dom_assignment.find(".delete-work-input-button");
        this.graph.off("mousemove").mousemove(this.mousemove.bind(this)); // Turn off mousemove to ensure there is only one mousemove handler at a time
        $(window).resize(this.resize.bind(this));

        // BEGIN Up and down arrow event handler
        {
        let graphtimeout,
            arrow_key_fired = false, // $(document).keydown( fires for every frame a key is held down. This makes it behaves like it fires once
            graphinterval;
        $(document).keydown(e => {
            if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.shiftKey && this.assignmentGraphIsOnScreen() && !arrow_key_fired) {
                // "arrow_key_fired" makes .keydown fire only when a key is pressed, not repeatedly
                arrow_key_fired = true;
                this.pressed_arrow_key = e.key;
                this.arrowSkewRatio();
                graphtimeout = setTimeout(function() {
                    clearInterval(graphinterval);
                    graphinterval = setInterval(this.arrowSkewRatio.bind(this), VisualAssignment.ARROW_KEYDOWN_INTERVAL);
                }.bind(this), VisualAssignment.ARROW_KEYDOWN_THRESHOLD);
            }
        }).keyup(e => {
            // Ensures the same key pressed fires the keyup to stop change skew ratio
            // Without this, you could press another key while the down arrow is being pressed for example and stop graphinterval
            if (e.key === this.pressed_arrow_key) {
                arrow_key_fired = false;
                clearTimeout(graphtimeout);
                clearInterval(graphinterval);
            }
        });
        }
        // END Up and down arrow event handler

        // BEGIN Hide assignment button
        hide_assignment_button.click(() => {
            this.sa.mark_as_done = !this.sa.mark_as_done;
            hide_assignment_button.text(hide_assignment_button.attr(`data-${this.sa.mark_as_done ? "show" : "hide"}-label`));
            ajaxUtils.sendAttributeAjaxWithTimeout('mark_as_done', this.sa.mark_as_done, this.sa.id);
            new Priority().sort();
        }).text(hide_assignment_button.attr(`data-${this.sa.mark_as_done ? "show" : "hide"}-label`));
        // END Hide assignment button

        // BEGIN Delete work input button
        {
        delete_work_input_button.click(() => {
            let len_works = this.sa.works.length - 1;
            if (!len_works) {
                VisualAssignment.flashNotApplicable(delete_work_input_button);
                return;
            }
            this.sa.works.pop();
            len_works--;
            for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                this.setDynamicStartIfInDynamicMode();
                this.autotuneSkewRatio({ inverse: false });
            }
            this.setDynamicStartIfInDynamicMode();
            ajaxUtils.sendAttributeAjaxWithTimeout("works", this.sa.works.map(String), this.sa.id);
            new Priority().sort({ timeout: true });
            this.draw();
        });
        }
        // END Delete work input button

        // BEGIN Work input textbox
        {
        let enter_fired = false;
        work_input_textbox.keydown(e => {
            if (e.key === "Enter" && !enter_fired) {
                enter_fired = true;
                submit_work_button.click();
            }
        })
        // an alert can sometimes cause the enter to be fired on another element, instead listen to the event's propagation to the root
        $(document).keyup(e => {
            if (e.key === "Enter") enter_fired = false;

            if (this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(work_input_textbox);
                return;
            }
        });
        }
        // END Work input textbox

        // BEGIN Submit work button
        {
        submit_work_button.click(() => {
            if (this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(submit_work_button);
                return;
            }

            const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
            let len_works = this.sa.works.length - 1;
            let last_work_input = this.sa.works[len_works];
            let not_applicable_message_title;
            let not_applicable_message_description;
            if (!work_input_textbox.val()) {
                not_applicable_message_title = "Enter a Value.";
                not_applicable_message_description = "Please enter a number or keyword (which can be found in the <a href=\"/user-guide#standard-assignment-graph-controls\">user guide</a>) into the textbox to submit a work input."
            } else if (last_work_input >= this.sa.y) {
                not_applicable_message_title = "Already Finished.";
                not_applicable_message_description = "You've already finished this assignment, so you can't enter any more work inputs.";
            }
            let todo = this.funct(len_works + this.sa.blue_line_start + 1) - last_work_input;
            let input_done = work_input_textbox.val().trim().toLowerCase();

            let use_in_progress = false;
            if (input_done.startsWith("today")) {
                input_done = input_done.replace("today", "").trim();
                use_in_progress = today_minus_assignment_date + 1 === len_works + this.sa.blue_line_start && today_minus_assignment_date >= 0; // last condition ensures the assignment has been assigned
            }
            if (input_done.startsWith("since")) {
                input_done = +input_done.replace("since", "").trim();
                if (isNaN(input_done)) {
                    not_applicable_message_title = "Invalid \"since\" format.";
                    not_applicable_message_description = "Please use the \"since\" keyword with the format: \"since [some number]\", with [some number] being your work input.";
                }
                const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
                const array_length = today_minus_assignment_date - (this.sa.blue_line_start + len_works) - 1;
                if (array_length < 0) return;
                this.sa.works.push(...new Array(array_length).fill(last_work_input));
                len_works = this.sa.works.length - 1;
            } else
                switch (input_done) {
                    case "done":
                    case "fin":
                        if (use_in_progress) return;
                        input_done = Math.max(0, todo);
                        break;
                    default: {
                        input_done = +input_done;
                        if (isNaN(input_done)) {
                            if (use_in_progress) {
                                not_applicable_message_title = "Invalid \"today\" format.";
                                not_applicable_message_description = "Please use the \"today\" keyword with the format: \"today [input]\", with [input] being a valid work input.";
                            } else {
                                not_applicable_message_title = "Invalid Input.";
                                not_applicable_message_description = "Please enter a valid number or keyword into the textbox to submit a work input."
                            }
                        }
                    }
                }
            if (not_applicable_message_title) {
                $.alert({
                    title: not_applicable_message_title,
                    content: not_applicable_message_description,
                    onDestroy: () => work_input_textbox.focus(),
                });
                return;
            }
            // Clear once textbox if the input is valid
            work_input_textbox.val("");
            // Cap at y and 0
            if (input_done + last_work_input > this.sa.y) {
                input_done = this.sa.y - last_work_input;
            } else if (input_done + last_work_input < 0) {
                input_done = -last_work_input;
            }
            last_work_input = mathUtils.precisionRound(last_work_input + input_done, 10);

            if (use_in_progress) {
                if (this.sa.works[len_works] === last_work_input) return; // Pointless input
                len_works--;
                this.sa.works.pop();

                // Attempts to undo the last work input to ensure the autotune isn't double dipped
                // Note that the invsering of the autotune algorithm is still not perfect, but usable
                for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                    this.setDynamicStartIfInDynamicMode();
                    this.autotuneSkewRatio({ inverse: false });
                }
                this.setDynamicStartIfInDynamicMode();
            }
            len_works++;
            this.sa.works.push(last_work_input);

            // this.sa.x + 1 because the user can enter an earlier due date and cut off works at the due date, which messes up soft due dates without this
            if ([this.sa.x, this.sa.x + 1].includes(len_works + this.sa.blue_line_start) && last_work_input < this.sa.y
                && this.sa.soft)
                this.incrementDueDate();
            // Will never run if incrementDueDate() is called
            if (len_works + this.sa.blue_line_start === this.sa.x + 1) {
                this.sa.works.pop();
                not_applicable_message_title = "End of Assignment.";
                not_applicable_message_description = "You've reached the end of this assignment; there are no more work inputs to submit.";
                $.alert({
                    title: not_applicable_message_title,
                    content: not_applicable_message_description,
                    onDestroy: () => work_input_textbox.focus(),
                });
                return;
            }
            
            // +Add this check for setDynamicModeIfInDynamicMode
            // -Old dynamic_starts, although still valid, may not be the closest value to len_works + this.sa.blue_line_start, and this can cause inconsistencies
            // +However, removing this check causes low skew ratios to become extremely inaccurate in dynamic mode
            // Autotune and setDynamicStartIfInDynamicMode somewhat fix this but fails with high minimum work times
            // -However, this isn't really that much of a problem; I can just call this a "feature" of dynamic mode in that it tries to make stuff linear. Disabling this makes dynamic mode completely deterministic in its red line start

            // Remember to add this check to the above autotune if I decide to add this back

            // Also remember to add this code if this is added back:
            // let todo_for_blue_line_end = this.funct(len_works + this.sa.blue_line_start + 1) - last_work_input;
            // if (this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + len_works) % 7)) {
            //     todo_for_blue_line_end = 0;
            // }
            
            // if (input_done !== todo_for_blue_line_end) {
                for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                    this.setDynamicStartIfInDynamicMode();
                    this.autotuneSkewRatio();
                }
                this.setDynamicStartIfInDynamicMode();
            // }

            ajaxUtils.sendAttributeAjaxWithTimeout("works", this.sa.works.map(String), this.sa.id);
            
            if (SETTINGS.close_graph_after_work_input && this.dom_assignment.hasClass("open-assignment") && this.sa.blue_line_start + len_works === today_minus_assignment_date + 1)
                this.dom_assignment.click();
            new Priority().sort({ timeout: true });
            this.draw();
        });
        }
        // END Submit work button

        // BEGIN Set skew ratio using graph button
        {
        let original_skew_ratio;
        skew_ratio_button.click(() => {
            if (original_skew_ratio) {
                skew_ratio_button.text(skew_ratio_button.attr("data-label"));
                this.set_skew_ratio_using_graph = false;
                this.sa.skew_ratio = original_skew_ratio;
                original_skew_ratio = undefined;
                this.setDynamicStartIfInDynamicMode();
                this.draw();
                // No need to ajax since skew ratio is the same
                return;
            }
            if (this.getWorkingDaysRemaining({ reference: "visual red line start" }) <= 1 || this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(skew_ratio_button);
                return;
            }
            original_skew_ratio = this.sa.skew_ratio;
            skew_ratio_button.text(skew_ratio_button.attr("data-active-label"));
            // Turn off mousemove to ensure there is only one mousemove handler at a time
            this.graph.off("mousemove").mousemove(this.mousemove.bind(this));
            this.graph.trigger("mousemove");
            this.set_skew_ratio_using_graph = true;
        });
        this.graph.click(e => {
            if (this.set_skew_ratio_using_graph) {
                // Runs if (set_skew_ratio_using_graph && draw_mouse_point || set_skew_ratio_using_graph && !draw_mouse_point)
                original_skew_ratio = undefined;
                this.set_skew_ratio_using_graph = false;
                skew_ratio_button.text(skew_ratio_button.attr("data-label"));
                ajaxUtils.sendAttributeAjaxWithTimeout('skew_ratio', this.sa.skew_ratio, this.sa.id);
                ajaxUtils.sendAttributeAjaxWithTimeout('dynamic_start', this.sa.dynamic_start, this.sa.id);
                if (!this.draw_mouse_point) {
                    this.graph.off("mousemove");
                }
                new Priority().sort();
                this.draw();
            } else if (this.draw_mouse_point) {
                // Runs if (!set_skew_ratio_using_graph && draw_mouse_point)
                // Disable draw point
                this.graph.off("mousemove");
                this.draw_mouse_point = false;
                const hover_point_label = this.dom_assignment.find(".hover-point-label");
                hover_point_label.addClass("hide-label");
                delete this.last_mouse_x;
                this.draw();
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
        }
        // END Set skew ratio button using graph button


        // BEGIN Fixed/dynamic mode button
        {
        fixed_mode_button.click(() => {
            if (this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(fixed_mode_button);
                return;
            }

            this.sa.fixed_mode = !this.sa.fixed_mode;
            fixed_mode_button.text(fixed_mode_button.attr(`data-${this.sa.fixed_mode ? "dynamic" : "fixed"}-mode-label`));
            ajaxUtils.sendAttributeAjaxWithTimeout('fixed_mode', this.sa.fixed_mode, this.sa.id);
            if (this.sa.fixed_mode) {
                this.red_line_start_x = 0;
                this.red_line_start_y = 0;
            } else {
                this.red_line_start_x = this.sa.dynamic_start;
                this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
            }
            // Don't sa.autotuneSkewRatio() because we don't want to change the skew ratio when the user hasn't submitted any work inputs
            // However, we still need to call setDynamicStartIfInDynamicMode() to compensate if the skew ratio in fixed mode was modified
            this.setDynamicStartIfInDynamicMode();
            new Priority().sort();
            this.draw();
        }).text(fixed_mode_button.attr(`data-${this.sa.fixed_mode ? "dynamic" : "fixed"}-mode-label`));
        }
        // END Fixed/dynamic mode button        
    }
    shake() {
        const that = this;
        that.dom_assignment.animate({left: -5}, 75, "easeOutCubic", function() {
            that.dom_assignment.animate({left: 5}, 75, "easeOutCubic", function() {
                that.dom_assignment.animate({left: 0}, 75, "easeOutCubic");
            });
        });
    }

    positionTags() {
        const dom_tags = this.dom_assignment.find(".tags");
        switch (SETTINGS.horizontal_tag_position) {
            case "Left":
                if (SETTINGS.vertical_tag_position === "Top") {
                    dom_tags.removeClass("tags-top");
                    dom_tags.addClass("tags-bottom");
                }
                
                const dom_title = this.dom_assignment.find(".title");
                const dom_title_and_description_container = this.dom_assignment.find(".relative-positioning-wrapper");

                this.dom_assignment.prop("style").setProperty("--vertical-assignment-padding", "unset");
                // use offsetTop to ignore the transform scale
                let tag_top = dom_tags[0].offsetTop;
                let title_top = dom_title_and_description_container[0].offsetTop;
                let title_height = dom_title_and_description_container.height() + parseFloat(window.getComputedStyle(dom_title[0], "::after").height) - parseFloat(window.getComputedStyle(dom_title[0]).getPropertyValue("--smush-daysleft"));

                // title_top + title_height - tag_top to first align the top of the tags with the bottom of the title
                const padding_to_add = title_top + title_height - tag_top + parseFloat(window.getComputedStyle(dom_tags[0]).getPropertyValue("--tags-left--margin-top"));
                this.dom_assignment.prop("style").setProperty("--vertical-assignment-padding", `${Math.max(0, padding_to_add + parseFloat(window.getComputedStyle($("#assignments-container")[0]).getPropertyValue("--vertical-assignment-padding")))}px`);

                if (SETTINGS.vertical_tag_position === "Top") {
                    dom_tags.addClass("tags-top");
                    dom_tags.removeClass("tags-bottom");
                }
                break;

            case "Middle":
                if (!dom_tags.parents(".align-to-status-message-container").length) {
                    dom_tags.prependTo(this.dom_assignment.find(".align-to-status-message-container"));
                }
                break;
        }
    }
    displayTruncateWarning() {
        const relative_positioning_wrapper = this.dom_assignment.find(".relative-positioning-wrapper");
        relative_positioning_wrapper.toggleClass("display-truncate-warning", relative_positioning_wrapper.find(".description").hasOverflown());
    }
}
let already_ran_tutorial = false;
let prevent_click = false;
$(function() {
$(".assignment").click(function(e/*, params={ initUI: true }*/) {
    const target = $(e.target);
    const targetInHeader = !!target.parents(".assignment-header").length || target.is(".assignment-header, .assignment");
    const targetInTags = !!target.parents(".tags").length || target.is(".tags");
    const targetInButton = !!target.parents(".assignment-header-button").length || target.is(".assignment-header-button");
    const dontFire = targetInTags || targetInButton;
    if (!targetInHeader || dontFire || prevent_click) return;
    const dom_assignment = $(this);
    const sa = new VisualAssignment(dom_assignment);
    
    if (sa.sa.needs_more_info && !Number.isFinite(sa.sa.x)) {
        sa.shake();
        dom_assignment.find(".update-button").parents(".assignment-header-button").focus();
        return;
    }

    const assignment_footer = dom_assignment.find(".assignment-footer");
    // Close assignment
    if (dom_assignment.hasClass("open-assignment")) {
        // Animate the graph's margin bottom to close the assignment and make the graph's overflow hidden
        dom_assignment.addClass("assignment-is-closing").removeClass("open-assignment").css("overflow", "hidden");
        assignment_footer.find(".graph-footer *").attr("tabindex", -1);
        assignment_footer.animate({
            marginBottom: -assignment_footer.height(),
        }, VisualAssignment.CLOSE_ASSIGNMENT_TRANSITION_DURATION, "easeOutCubic", function() {
            // Hide graph when transition ends
            dom_assignment.css("overflow", "").removeClass("assignment-is-closing")
            assignment_footer.find(".graph-footer *").removeAttr("tabindex");
            assignment_footer.css({
                display: "",
                marginBottom: "",
                transition: "",
            });
            // Assignment name dom element can change height and the assignment header buttons can mess up their negative margins, so repoisiton the tags
            sa.positionTags();
        });
        sa.positionTags();
        dom_assignment.find(".falling-arrow-animation")[0].beginElement();
        return;
    }
    SETTINGS.one_graph_at_a_time && $("#close-assignments").click();
    
    // If the assignment was clicked while it was closing, stop the closing animation and open it
    assignment_footer.stop(false, true);
    dom_assignment.addClass("open-assignment");
    sa.positionTags();
    sa.displayTruncateWarning();
    assignment_footer.css("display", "block");
    dom_assignment.find(".rising-arrow-animation")[0].beginElement();
    // Sets event handlers only on the assignment's first click
    // make sure to also change util.js if this is modified
    const first_click = !dom_assignment.hasClass('has-been-clicked');
    dom_assignment.addClass("has-been-clicked");
    first_click && sa.setGraphButtonEventListeners();

    sa.resize();
    if (SETTINGS.enable_tutorial && !already_ran_tutorial && !DEBUG) {
        already_ran_tutorial = true;
        prevent_click = true;
        $("#tutorial-click-assignment-to-open").remove();
        setTimeout(function() {
            const days_until_due = Math.floor(sa.sa.complete_x) - sa.sa.blue_line_start;
            utils.ui.graphAlertTutorial(days_until_due);
            prevent_click = false;
        }, VisualAssignment.BUTTON_ERROR_DISPLAY_TIME);
    }
});
});