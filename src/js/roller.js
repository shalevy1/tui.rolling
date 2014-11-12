/**
 * @fileoverview 움직임 좌표, 움직이는 방식 위치등을 정하여 액션을 수행함
 * @author Jein Yi
 * @dependency common.js[type, object, collection, function, CustomEvents, defineClass]
 *
 * */

/**
 * 롤링의 움직임을 수행하는 롤러
 *
 * @param {Object} option 롤링컴포넌트(ne.component.Rolling)의 옵션
 * @namespace ne.component.Rolling.Roller
 * @constructor
 */
ne.component.Rolling.Roller = ne.defineClass(/** @lends ne.component.Rolling.Roller.prototype */{
    init: function(option, initData) {
        /**
         * 옵션을 저장한다
         * @type {Object}
         */
        this._option = option;
        /**
         * 루트 엘리먼트를 저장한다
         * @type {element|*}
         * @private
         */
        this._element = ne.isString(option.element) ? document.getElementById(option.element) : option.element;
        /**
         * 롤링컴포넌트의 방향 저장(수직, 수평)
         * @type {String}
         * @private
         */
        this._direction = option.direction || 'horizontal';
        /**
         * 이동할 스타일 속성 ('left | top')
         *
         * @type {string}
         * @private
         */
        this._range = this._direction === 'horizontal' ? 'left' : 'top';
        /**
         * 이동에 사용되는 함수
         * @type {Function}
         */
        this._motion = ne.component.Rolling.Roller.motion[option.motion || 'noeffect'];
        /**
         * 롤링을 할 단위
         * @type {Number}
         * @private
         */
        this._rollunit = option.unit || 'page';
        /**
         * 롤링의 방향을 결정한다(전, 후)
         *
         * @type {String|string}
         * @private
         */
        this._flow = option.flow || 'next';
        /**
         * 애니메이션의 duration
         *
         * @type {*|number}
         * @private
         */
        this._duration = option.duration || 1000;
        /**
         * 롤러 상태
         * @type {String}
         */
        this.status = 'idle';
        /**
         * 좌표를 움직일 컨테이너
         * @type {HTMLElement}
         * @private
         */
        this._container = this._getContainer();
        /**
         * 롤러 패널들, 3가지 패널만 갖는다
         * @type {Object}
         */
        this.panel = { prev: null, center: null, next: null };
        /**
         * 루트 엘리먼트의 너비, 이동단위가 페이지이면 이게 곧 이동 단위가 된다
         * @type {number}
         * @private
         */
        this._distance = 0;
        /**
         * 움직일 패널 타겟들
         *
         * @type {Array}
         * @private
         */
        this._targets = [];
        /**
         * 무브 상태일때 들어오는 명령 저장
         *
         * @type {Array}
         * @private
         */
        this._queue = [];
        /**
         * 커스텀이벤트
         * @type {Object}
         * @private
         */
        this._events = {};

        this._masking();
        this._setUnitDistance();
        this._setPanel(initData);
    },
    /**
     * 롤링을 위해, 루트앨리먼트를 마스크화 한다
     *
     * @method
     * @private
     */
    _masking: function() {

        var element = this._element,
            elementStyle = element.style;
        elementStyle.position = 'relative';
        elementStyle.overflow = 'hidden';
        elementStyle.width = elementStyle.width || (element.clientWidth + 'px');
        elementStyle.height = elementStyle.height || (element.clientHeight + 'px');

    },
    /**
     * 유닛의 이동거리를 구한다
     *
     * @private
     */
    _setUnitDistance: function() {

        var dist,
            elementStyle = this._element.style;

        if (this._direction === 'horizontal') {
            dist = elementStyle.width.replace('px', '');
        } else {
            dist = elementStyle.height.replace('px', '');
        }

        // 이동단위가 페이지가 아닐경우
        if (this._rollunit !== 'page') {
            dist = Math.ceil(dist / this._itemcount);
        }
        this._distance = dist;
    },
    /**
     * 롤링될 패널들을 만든다
     *
     * @private
     */
    _setPanel: function(initData) {
        // 데이터 입력
        var panel = this._container.firstChild,
            panelSet = this.panel,
            option = this._option,
            tag,
            className,
            key;

        // 옵션으로 패널 태그가 있으면 옵션사용
        if (ne.isString(option.panelTag)) {
            tag = (option.panelTag).split('.')[0];
            className = (option.panelTag).split('.')[1];
        } else {
            // 옵션으로 설정되어 있지 않을 경우 컨테이너 내부에 존재하는 패널 엘리먼트 검색
            // 첫번째가 텍스트 일수 있으므로 다음요소까지 확인한다. 없으면 'li'
            if (!ne.isHTMLTag(panel)) {
                panel = panel && panel.nextSibling;
            }
            tag = ne.isHTMLTag(panel) ? panel.tagName : 'li';
            className = (panel && panel.className) || '';
        }

        this._container.innerHTML = '';

        // 패널 생성
        for (key in panelSet) {
            panelSet[key] = this._makeElement(tag, className, key);
        }

        // 중앙 패널만 붙임
        panelSet.center.innerHTML = initData;
        this._container.appendChild(panelSet.center);

    },
    /**
     * HTML Element를 만든다
     *
     * @param {String} tag 엘리먼트 태그명
     * @param {String} className 엘리먼트 클래스 명
     * @param {String} key 클래스에 붙는 이름
     * @returns {HTMLElement}
     * @private
     */
    _makeElement: function(tag, className, key) {
        var element = document.createElement(tag);
        element.className = className;
        element.style.position = 'absolute';
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.left = '0px';
        element.style.top = '0px';
        return element;
    },
    /**
     * 해당 패널 데이터를 설정한다.
     *
     * @param {String} data 패널을 갱신할 데이터
     * @private
     */
    _updatePanel: function(data) {
        this.panel[this._flow || 'center'].innerHTML = data;
    },
    /**
     * 이동할 패널을 붙인다
     */
    _appendMoveData: function() {
        var flow = this._flow,
            movePanel = this.panel[flow],
            style = movePanel.style,
            dest = (flow === 'prev' ? -this._distance : this._distance) + 'px';

        style[this._range] = dest;

        this.movePanel = movePanel;
        this._container.appendChild(movePanel);
    },
    /**
     * 롤링될 컨테이너를 생성 or 구함
     *
     * @returns {*}
     * @private
     */
    _getContainer: function() {
        var option = this._option,
            element = this._element,
            firstChild = element.firstChild,
            wrap,
            next,
            tag,
            className;
        // 옵션으로 넘겨받은 태그가 있으면 새로 생성
        if (option.wrapperTag) {
            tag = option.wrapperTag && option.wrapperTag.split('.')[0];
            className = option.wrapperTag && option.wrapperTag.split('.')[1] || '';
            wrap = document.createElement(tag);
            if (className) {
                wrap.className = className;
            }
            this._element.innerHTML = '';
            this._element.appendChild(wrap);
        } else {
            // 만약 천번째 엘리먼트가 존재하면 컨테이너로 인식
            if (ne.isHTMLTag(firstChild)) {
                return firstChild;
            }
            // 아닐경우 그 다음앨리먼트를 찾는다
            next = firstChild && firstChild.nextSibling;
            if (ne.isHTMLTag(next)) {
                wrap = next;
            } else {
                // 엘리먼트가 존재하지 않을경우 기본값인 ul을 만들어 컨테이너로 리턴
                wrap = document.createElement('ul');
                this._element.appendChild(wrap);
            }
        }
        return wrap;
    },
    /**
     * 각 패널들이 움직일 값을 구한다
     * @returns {*}
     * @private
     */
    _getMoveSet: function() {
        var flow = this._flow;
        // 좌측이나 위에 붙어있으면 다음패널로 가는 것으로 인식
        if (flow === 'prev') {
            return [0, this._distance];
        } else {
            return [-this._distance, 0];
        }
    },
    /**
     * 이동 시작점들을 구해온다
     *
     * @returns {Array}
     * @private
     */
    _getStartSet: function() {
        var panel = this.panel,
            flow = this._flow,
            range = this._range,
            isPrev = flow === 'prev',
            first = isPrev ? panel['prev'] : panel['center'],
            second = isPrev ? panel['center'] : panel['next'];
        return [parseInt(first.style[range], 10), parseInt(second.style[range], 10)];
    },
    _queueing: function(data, duration, flow) {
        this._queue.push({
            data: data,
            duration: duration,
            flow: flow
        });
    },
    /**
     * 패널 이동
     *
     * @param {Object} data 이동할 패널의 갱신데이터
     */
    move: function(data, duration, flow) {
        // 상태 체크, idle상태가 아니면 큐잉
        var flow = this._flow;
        if (this.status === 'idle') {
            this.status = 'run';
        } else {
            this._queueing(data, duration, flow);
            return;
        }

        /**
         * 무브 시작전에 이벤트 수행
         *
         * @fires beforeMove
         * @param {String} data 내부에 위치한 HTML
         * @example
         * ne.component.RollingInstance.attach('beforeMove', function(data) {
         *    // ..... run code
         * });
         */
        this.fire('beforeMove', { data: data });
        // 다음에 중앙에 올 패널 설정
        this._updatePanel(data);
        this._appendMoveData();

        // 움직일 타겟 선
        this.targets = [this.panel['center']];
        if (flow === 'prev') {
            this.targets.unshift(this.panel[flow]);
        } else {
            this.targets.push(this.panel[flow]);
        }

        // 모션이 없으면 기본 좌표 움직임
        if (!this._motion) {
            this._moveWithoutMotion();
        } else {
            this._moveWithMotion(duration);
        }
    },
    /**
     * 모션이 없을 경우, 바로 좌표설정을 한다
     *
     * @private
     */
    _moveWithoutMotion: function() {
        var flow = this._flow,
            pos = this._getMoveSet(flow),
            range = this._range;
        ne.forEach(this.targets, function(element, index) {
            element.style[range] = pos[index] + 'px';
        });
        this.fix();
    },
    /**
     * 모션이 있을 경우, 모션을 수행한다
     *
     * @private
     */
    _moveWithMotion: function(duration) {
        // 일시적 duration의 변경이 있을땐 인자로 넘어온다.(ex 페이지 한꺼번에 건너 뛸때)
        var flow = this._flow,
            start = this._getStartSet(flow),
            distance = this._distance,
            duration = duration || this._duration,
            range = this._range;

        this._animate({
            delay: 10,
            duration: duration || 1000,
            delta: this._motion,
            step: ne.bind(function(delta) {
                ne.forEach(this.targets, function(element, index) {

                    var dest = (flow === 'prev') ? dest = distance * delta : dest = -(distance * delta);
                    element.style[range] = start[index] + dest + 'px';

                });
            }, this),
            complate: ne.bind(this.fix, this)
        });
    },
    /**
     * 러닝상태를 해제한다.
     * 센터를 재설정 한다.
     */
    fix: function() {
        var panel = this.panel,
            tempPanel,
            flow = this._flow;

        tempPanel = panel['center'];
        panel['center'] = panel[flow];
        panel[flow] = tempPanel;

        this.targets = null;
        this._container.removeChild(tempPanel);
        this.status = 'idle';

        // 큐에 데이터가 있으면 무브를 다시 호출하고 없으면 move의 완료로 간주하고 afterMove를 호출한다
        if (ne.isNotEmpty(this._queue)) {
            var first = this._queue.splice(0, 1)[0];
            this.move(first.data, first.duration, first.flow);
        } else {
            /**
             * 이동이 끝나면 이벤트 수행
             * @fires afterMove
             * @example
             * ne.component.RollingInstance.attach('afterMove', function() {
             *    // ..... run code
             * });
             */
            this.fire('afterMove');
        }
    },
    /**
     * 애니메이션 효과를 변경한다.
     * @param {String} type 바꿀 모션이름
     */
    changeMotion: function(type) {
        this._motion = ne.component.Rolling.Roller.motion[type];
    },
    /**
     * 애니메이션 수행
     *
     * @param {Object} option 애니메이션 옵션
     */
    _animate: function(option) {
        var start = new Date(),
            id = window.setInterval(function() {
                var timePassed = new Date() - start,
                    progress = timePassed / option.duration,
                    delta;
                if (progress > 1) {
                    progress = 1;
                }
                delta = option.delta(progress);

                option.step(delta);

                if (progress === 1) {
                    window.clearInterval(id);
                    option.complate();
                }
            }, option.delay || 10);
    },
    /**
     * 기본 방향값 설정
     *
     * @param {String} flow 아무값도 넘어오지 않을시, 기본으로 사용될 방향값
     */
    setFlow: function(flow) {
        this._flow = flow || this._flow || 'next';
    }
});
// 커스텀이벤트 믹스인
ne.CustomEvents.mixin(ne.component.Rolling.Roller);

/**
 * 롤링에 필요한 모션 함수 컬렉션
 *
 * @namespace ne.component.Rolling.Roller.motion
 */
ne.component.Rolling.Roller.motion = (function() {
    var quadEaseIn,
        circEaseIn,
        quadEaseOut,
        circEaseOut,
        quadEaseInOut,
        circEaseInOut;

    /**
     * easeIn
     *
     * @param delta
     * @returns {Function}
     */
    function makeEaseIn(delta) {
        return function(progress) {
            return delta(progress);
        }
    }
    /**
     * easeOut
     *
     * @param delta
     * @returns {Function}
     */
    function makeEaseOut(delta) {
        return function(progress) {
            return 1 - delta(1 - progress);
        }
    }

    /**
     * easeInOut
     *
     * @param delta
     * @returns {Function}
     */
    function makeEaseInOut(delta) {
        return function(progress) {
            if (progress < 0.5) {
                return delta(2 * progress) / 2;
            } else {
                return (2 - delta(2 * (1 - progress))) / 2;
            }
        }
    }
    /**
     * 선형
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method linear
     * @static
     */
    function linear(progress) {
        return progress;
    }
    function quad(progress) {
        return Math.pow(progress, 2);
    }
    function circ(progress) {
        return 1 - Math.sin(Math.acos(progress));
    }

    /**
     * qued + easeIn
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method quadEaseIn
     * @static
     */
    quadEaseIn = makeEaseIn(quad),
    /**
     * circ + easeIn
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method circEaseIn
     * @static
     */
    circEaseIn = makeEaseIn(circ),
    /**
     * quad + easeOut
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method quadEaseOut
     * @static
     */
    quadEaseOut = makeEaseOut(quad),
    /**
     * circ + easeOut
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method circEaseOut
     * @static
     */
    circEaseOut = makeEaseOut(circ),
    /**
     * quad + easeInOut
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method quadEaseInOut
     * @static
     */
    quadEaseInOut = makeEaseInOut(quad),
    /**
     * circ + easeInOut
     *
     * @memberof ne.component.Rolling.Roller.motion
     * @method circEaseInOut
     * @static
     */
    circEaseInOut = makeEaseInOut(circ);

    return {
        linear: linear,
        easeIn: quadEaseIn,
        easeOut: quadEaseOut,
        easeInOut: quadEaseInOut,
        quadEaseIn: quadEaseIn,
        quadEaseOut: quadEaseOut,
        quadEaseInOut: quadEaseInOut,
        circEaseIn: circEaseIn,
        circEaseOut: circEaseOut,
        circEaseInOut: circEaseInOut
    };
})();
