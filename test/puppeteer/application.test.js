/**
 * Testing application
 */

const { expect } = require("chai");
const helpers = require("./../helpers");

describe("Application", () => {

    it(`generate PDF`, async () => {
        const page = await browser.newPage();
        await page.goto(`https://vidi.alexshumilov.ru/app/aleksandrshumilov/public/?tmpl=print.tmpl&l=inline&h=none&px=1060&py=730&td=8th%20August%202018,%2014:48&d=8th%20August%202018&k=f943879f-f2be-4926-81ca-9b0fba161a05&t=&c=#osm/15/39.2765/-6.8216/v:public.test_line,public.test_poly,public.test`);
        await helpers.sleep(5000);
        await page.pdf({
            path: './test.pdf',
        });        
    });


    it("should constantly check for connection status and keep Force offline mode selector updated", async () => {
        const page = await browser.newPage();
        await page.goto(helpers.PAGE_URL);
        await helpers.sleep(helpers.PAGE_LOAD_TIMEOUT);
        await page.reload();
        await helpers.sleep(helpers.PAGE_LOAD_TIMEOUT);

        expect(await page.evaluate(`$('.js-app-is-online-badge').hasClass('hidden');`)).to.be.false;
        expect(await page.evaluate(`$('.js-app-is-offline-badge').hasClass('hidden');`)).to.be.true;

        let forceOfflineModeIndicator;
        forceOfflineModeIndicator = await page.evaluate(`$('.js-toggle-offline-mode').is(':checked')`);
        expect(forceOfflineModeIndicator).to.be.false;

        await page.evaluate(`$('.js-toggle-offline-mode').parent().find('.toggle').trigger('click')`);

        forceOfflineModeIndicator = await page.evaluate(`$('.js-toggle-offline-mode').is(':checked')`);
        expect(forceOfflineModeIndicator).to.be.true;
    });

    it("should be able to reset the application", async () => {
        const page = await browser.newPage();
        await page.goto(`${helpers.PAGE_URL.replace('8082', '8081')}test.polygon,public.urbanspatial_dar_es_salaam_luse_2002,public.test_poly,v:public.test,v:public.test_line`);
        await helpers.sleep(helpers.PAGE_LOAD_TIMEOUT);

        // Accepting the dialog
        page.on('dialog', (dialog) => {
            dialog.accept();
        });

        await page.evaluate(`$('[class="floatRight cursorPointer fa fa-reorder"]').trigger('click')`);
        await helpers.sleep(1000);
        await page.evaluate(`$('[href="#layer-content"]').trigger('click')`);
        await helpers.sleep(1000);
        await page.evaluate(`$('[href="#collapseUHVibGljIGdyb3Vw"]').trigger('click')`);
        await helpers.sleep(1000);

        expect(await page.evaluate(`$('input[data-gc2-id="test.polygon"]').is(':checked')`)).to.be.true;
        expect(await page.evaluate(`$('input[data-gc2-id="public.test"]').is(':checked')`)).to.be.true;

        // Check if the panel for different schema was drawn as well
        expect(await page.evaluate(`$('#layers_list').find('.accordion-toggle').eq(0).text()`)).to.equal(`Test group`);
        expect(await page.evaluate(`$('#layers_list').find('.accordion-toggle').eq(1).text()`)).to.equal(`Dar es Salaam Land Use and Informal Settlement Data Set`);
        expect(await page.evaluate(`$('#layers_list').find('.accordion-toggle').eq(2).text()`)).to.equal(`Public group`);

        // Click the reset button
        await page.click(`#btn-reset`);
        await helpers.sleep(4000);
        await page.evaluate(`$('[href="#collapseUHVibGljIGdyb3Vw"]').trigger('click')`);
        await helpers.sleep(1000);

        expect(await page.evaluate(`$('input[data-gc2-id="public.test"]').is(':checked')`)).to.be.false;

        // Check if the panel for different schema was drawn as well
        expect(await page.evaluate(`$('#layers_list').find('.accordion-toggle').eq(0).text()`)).to.equal(`Test group`);
        expect(await page.evaluate(`$('#layers_list').find('.accordion-toggle').eq(1).text()`)).to.equal(`Dar es Salaam Land Use and Informal Settlement Data Set`);
        expect(await page.evaluate(`$('#layers_list').find('.accordion-toggle').eq(2).text()`)).to.equal(`Public group`);

        expect(page.url()).to.equal(helpers.PAGE_URL.replace('8082', '8081'));
    });

    it("should ignore invalid layer in URL", async () => {
        const page = await browser.newPage();
        await page.goto(`${helpers.PAGE_URL.replace('8082', '8081')}test.polygon,public.test_poly_invalid_layer,v:public.test_line`);
        await helpers.sleep(helpers.PAGE_LOAD_TIMEOUT);

        // Accepting the dialog
        page.on('dialog', (dialog) => {
            dialog.accept();
        });

        await page.evaluate(`$('[class="floatRight cursorPointer fa fa-reorder"]').trigger('click')`);
        await helpers.sleep(1000);
        await page.evaluate(`$('[href="#layer-content"]').trigger('click')`);
        await helpers.sleep(1000);
        await page.evaluate(`$('[href="#collapseUHVibGljIGdyb3Vw"]').trigger('click')`);
        await helpers.sleep(1000);

        expect(await page.evaluate(`$('input[data-gc2-id="test.polygon"]').is(':checked')`)).to.be.true;
        expect(await page.evaluate(`$('input[data-gc2-id="public.test_line"]').is(':checked')`)).to.be.true;
    });

    it("should update coordinates upon map changes", async () => {
        const page = await browser.newPage();
        await page.goto(`${helpers.PAGE_URL.replace('8082', '8081')}`);
        await helpers.sleep(helpers.PAGE_LOAD_TIMEOUT);

        await page.evaluate(`$('[class="floatRight cursorPointer fa fa-reorder"]').trigger('click')`);
        await helpers.sleep(1000);
        await page.evaluate(`$('[href="#coordinates-content"]').trigger('click')`);
        await helpers.sleep(1000);

        let initialCoordinates = await page.evaluate(`$('#coordinates').find('h3').eq(1).next().html()`);

        await helpers.sleep(1000);
        await page.mouse.move(50, 50);
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up();
        await helpers.sleep(1000);
        await page.mouse.move(200, 200);

        await helpers.sleep(1000);

        let updatedCoordinates = await page.evaluate(`$('#coordinates').find('h3').eq(1).next().html()`);

        expect(initialCoordinates === updatedCoordinates).to.be.false;
    });
});
