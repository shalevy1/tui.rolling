describe('roller', function() {

    jasmine.getFixtures().fixturesPath = "base/test/fixture";
    jasmine.getStyleFixtures().fixturesPath = "base/test/fixture";

    beforeEach(function() {
        loadFixtures("roller.html");
        loadStyleFixtures('fixedhtml.css');
    });

    var roller1,
        roller2,
        roller3,
        roller4;

    it('defined roller', function() {

        var div1 = document.getElementById('roller1'),
            div2 = document.getElementById('roller2'),
            div3 = document.getElementById('roller3'),
            div4 = document.getElementById('roller4');

        roller1 = new ne.component.Rolling.Roller({
            element: div1
        }, 'data1'),

        roller2 = new ne.component.Rolling.Roller({
            element: div2,
            direction: 'vertical'
        }, 'data2');

        // width 300px; height:150px;
        roller3 = new ne.component.Rolling.Roller({
            element: div3,
            direction: 'horizontal',
            isVariable: false,
            isAuto: false,
            duration: 400,
            isCircle: true,
            isDrawn: true,
            unit: 'page'
        });
        // width 150px, height: 300px;
        roller4 = new ne.component.Rolling.Roller({
            element: div4,
            direction: 'vertical',
            isVariable: false,
            isAuto: false,
            duration: 400,
            isCircle: true,
            isDrawn: true,
            unit: 'item'
        });

        expect(roller1).toBeDefined();
        expect(roller2).toBeDefined();
        expect(roller3).toBeDefined();
        expect(roller4).toBeDefined();
    });

    it('option.isDrawn : check itemcount', function() {
        var itemcount3 = roller3._itemcount,
            itemcount4 = roller4._itemcount;
        expect(itemcount3).toBe(3);
        expect(itemcount4).toBe(3);
    });

    it('_setUnitDistance called?', function() {
        var distance1 = roller1._distance,
            distance2 = roller2._distance,
            distance3 = roller3._distance,
            distance4 = roller4._distance;
        expect(distance1).toBe(300);
        expect(distance2).toBe(100);
        expect(distance3).toBe(300);
        expect(distance4).toBe(100);
    });

    var data = 'JsonCompare Nightmare',
        type = 'next',
        moveElement,
        beforeCenter,
        moveSet,
        beforePos1, beforePos2,
        afterPos1, afterPos2;

    it('test move flow (not isDrawn)', function() {
        var panel = roller1.panel;
        // roller1._getMoveSet
        moveSet = roller1._getMoveSet();
        expect(moveSet[0]).toBe(-roller1._distance);
        expect(moveSet[1]).toBe(0);

        // roller1._updatePanel(data, type);
        roller1._updatePanel(data);
        expect(panel[type].innerHTML).toBe(data);

        // roller1._appendMoveData(type);
        roller1._appendMoveData(type);
        moveElement = roller1.movePanel;
        beforeCenter = panel['center'].nextSibling;
        expect(moveElement).toBe(panel[type]);
        expect(moveElement).toBe(beforeCenter);

        // 상태 초기화 후 무브 수행
        //roller1.fix();
        roller1.move(data, type);
        beforePos1 = parseInt(panel['center'].style.left);
    });

    it('test move flow (isDrawn)', function() {
        var panels,
            moveset;

        // roller1._rotatePanel(type);
        roller3._rotatePanel('next');
        roller3._setPanel();

        panels = roller3._panels
        moveset = roller3._movePanelSet;
        expect(moveset.length).toBe(3);
        expect(panels[0]).toBe(moveset[0]);

    });

    it('filter test', function() {
        var array = [document.createTextNode('1'), document.createElement('div'), document.createElement('div'), document.createTextNode('a')],
        arr = roller3._filter(array);
        expect(arr.length).toBe(2);
    });

    it('check move result', function(done) {
        var panel = roller1.panel;
        setTimeout(function() {
            afterPos1 = parseInt(panel['center'].style.left);
            expect(beforePos1).toBe(beforePos1);
            done();
        }, 3000);
    });

    it('Custom Event mixin', function() {
        expect(roller1.on).toBeDefined();
        expect(roller2.on).toBeDefined();
    });

    it('Custom Event test', function() {
        var a = 0;
        roller1.on('move', function() {
            a++;
            checkCustom();
        });
        roller1.fire('move');
        function checkCustom() {
            expect(a).toBe(1);
        }
    });


});