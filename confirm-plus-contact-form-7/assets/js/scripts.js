(function () {
    'use strict';

    // Check if required global localization array exists
    if (typeof data_arr === 'undefined') {
        return;
    }

    // Map to keep track of initial form field values for resetting
    const initialFormValues = new Map();

    /**
     * Resets form to its initial state using stored initial values.
     */
    const resetForm = function(formElm) {
        const initial = initialFormValues.get(formElm);
        if (!initial) return;
        
        initial.forEach(field => {
            if (field.type === 'checkbox' || field.type === 'radio') {
                field.element.checked = field.checked;
            } else {
                field.element.value = field.value;
            }
        });

        // Reset file inputs explicitly
        formElm.querySelectorAll('input[type="file"]').forEach(file => {
            file.value = '';
        });
    };

    /**
     * Sanitizes values and converts newlines to HTML breaks.
     */
    const sanitizeText = function(textVal) {
        if (!textVal) return '';
        return textVal
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#x60;')
            .replace(/\r?\n/g, '<br>');
    };

    /**
     * Extracts text templates wrapped in special layout classes.
     */
    const getTextSet = function(inputObj) {
        const textSetObj = inputObj.closest('.text-set-contactform7');
        if (!textSetObj) {
            return null;
        }
        const clone = textSetObj.cloneNode(true);
        const inputToReplaces = clone.querySelectorAll('input, select');
        inputToReplaces.forEach(input => {
            const name = input.getAttribute('name');
            if (name) {
                const cleanName = name.replace('[]', '');
                const placeholder = document.createTextNode(`{%${cleanName}%}`);
                if (input.parentNode) {
                    input.parentNode.replaceChild(placeholder, input);
                }
            }
        });
        return clone.textContent;
    };

    const splitter = ', ';

    /**
     * Closes confirmation window and restores form visibility.
     */
    const wpcf7cp_edit = function(formElm) {
        if (!formElm) return;
        formElm.classList.remove('wpcf7cp-form-hide');
        const container = formElm.closest('div.wpcf7');
        if (container) {
            const cnf = container.querySelector('#wpcf7cpcnf');
            if (cnf) cnf.remove();
        }
    };

    /**
     * Sends form submit action from the confirmation screen.
     */
    const wpcf7cp_mail_send = function(formElm) {
        if (!formElm) return;
        const submitButton = formElm.querySelector('input.wpcf7-submit, button.wpcf7-submit');
        const responseOutput = formElm.querySelector('div.wpcf7-response-output');

        const onSubmitComplete = function(event) {
            if (event.target === formElm) {
                // Remove progress spinner
                formElm.querySelectorAll('.wpcf7cp-progress-cover, .wpcf7cp-progress-content').forEach(p => p.remove());

                // Restore validation/result message visibility
                if (responseOutput) {
                    responseOutput.classList.remove('wpcf7cp-force-hide');
                }

                // Reset form values to initial state
                resetForm(formElm);

                // Update status flag back to input state
                const statusInput = formElm.querySelector('input[name="_wpcf7cp"]');
                if (statusInput) statusInput.value = 'status_input';

                // Close confirmation box
                wpcf7cp_edit(formElm);

                // Scroll to submission message
                if (responseOutput) {
                    setTimeout(() => {
                        const rect = responseOutput.getBoundingClientRect();
                        const scrollToPosi = window.pageYOffset + rect.top - (window.innerHeight / 2);
                        window.scrollTo({
                            top: scrollToPosi,
                            behavior: 'smooth'
                        });
                    }, 100);
                }

                // Clean up listeners
                window.removeEventListener('wpcf7submit', onSubmitComplete);
                window.removeEventListener('wpcf7mailfailed', onSubmitComplete);
            }
        };

        window.addEventListener('wpcf7submit', onSubmitComplete);
        window.addEventListener('wpcf7mailfailed', onSubmitComplete);

        // Render progress overlay
        const cover = document.createElement('div');
        cover.className = 'wpcf7cp-progress-cover';
        const content = document.createElement('div');
        content.className = 'wpcf7cp-progress-content';
        const p = document.createElement('p');
        p.textContent = 'Progress...';
        content.appendChild(p);

        formElm.appendChild(cover);
        formElm.appendChild(content);

        // Trigger native submission click
        if (submitButton) {
            submitButton.click();
        }
    };

    /**
     * Resolves display label (title) for a given form element.
     */
    const wpcf7cp_get_title = function(element) {
        let title = null;

        const makeTitle = function(titleObj) {
            if (!titleObj) return '';
            const clone = titleObj.cloneNode(true);
            clone.querySelectorAll('.avoid-confirm').forEach(elm => elm.remove());
            // Exclude input elements, selects, textareas, and option items from group label text
            clone.querySelectorAll('.wpcf7-list-item, input, select, textarea').forEach(elm => elm.remove());
            return clone.textContent.trim();
        };

        const thisObj = element;
        const inputType = thisObj.getAttribute('type');
        const tagName = thisObj.tagName;

        // Check for fieldset legend first for check/radio inputs
        if (inputType === 'checkbox' || inputType === 'radio') {
            const fieldset = thisObj.closest('fieldset');
            if (fieldset) {
                const legend = fieldset.querySelector('legend');
                if (legend) {
                    title = makeTitle(legend);
                }
            }

            // Fallback for classic checkbox/radio: Find the outer label wrapping the group
            if (!title) {
                let ancestor = thisObj.parentElement;
                const ancestorLabels = [];
                while (ancestor && ancestor.tagName !== 'FORM') {
                    if (ancestor.tagName === 'LABEL') {
                        ancestorLabels.push(ancestor);
                    }
                    ancestor = ancestor.parentElement;
                }
                if (ancestorLabels.length > 1) {
                    title = makeTitle(ancestorLabels[ancestorLabels.length - 1]);
                }
            }
        }

        if (!title) {
            const nameAttr = thisObj.getAttribute('name');
            if (!nameAttr) return null;
            const nameVal = nameAttr.replace(/\[\]$/, '');

            const formElm = thisObj.closest('form');
            const root = formElm || document;

            // Specification (2): Check label with matching 'for' attribute
            if (inputType !== 'radio') {
                const labelObjWithForAttr = root.querySelector(`label[for="${nameVal}"]`);
                if (labelObjWithForAttr) {
                    title = makeTitle(labelObjWithForAttr);
                }

                // Specification (1): Check parent label tag wrapper (except for checkbox)
                if (!title && inputType !== 'checkbox') {
                    const closestLabel = thisObj.closest('label');
                    if (closestLabel) {
                        if (tagName === 'SELECT') {
                            const clone = closestLabel.cloneNode(true);
                            clone.querySelectorAll('option').forEach(opt => opt.remove());
                            title = makeTitle(clone);
                        } else {
                            title = makeTitle(closestLabel);
                        }
                    }
                }
            }

            // Specification (4): Explicit class mapping (.title-contactform7.for-name)
            if (!title) {
                const classLabel = root.querySelector(`.title-contactform7.for-${nameVal}`);
                if (classLabel) {
                    title = makeTitle(classLabel);
                }
            }

            // Specification (3): Adjacent table cells matching via .title-contactform7
            if (!title) {
                const closestTr = thisObj.closest('tr');
                if (closestTr) {
                    const labelInSameTr = closestTr.querySelector('.title-contactform7');
                    if (labelInSameTr) {
                        title = makeTitle(labelInSameTr);
                    }
                }
            }

            // Specification (1) Fallback: Parent label tag for single checkboxes (e.g. policy acceptance)
            if (!title && inputType === 'checkbox') {
                const closestLabel = thisObj.closest('label');
                if (closestLabel) {
                    title = makeTitle(closestLabel);
                }
            }
        }

        return title;
    };

    /**
     * Builds and displays the confirmation page on event trigger.
     */
    const wpcf7cp_confirm = function(unit_tag) {
        const PATH_CODE = /[\\\/]/;

        // Query the specific form matching the active unit_tag
        const unitTagInput = document.querySelector(`form.wpcf7-form input[name="_wpcf7_unit_tag"][value="${unit_tag}"]`);
        if (!unitTagInput) return;
        const formElm = unitTagInput.closest('form');
        if (!formElm) return;
        const wpcf7Container = formElm.closest('div.wpcf7');
        if (!wpcf7Container) return;

        // Change status input to confirm state
        const statusInput = formElm.querySelector('input[name="_wpcf7cp"]');
        if (statusInput) statusInput.value = 'status_confirm';

        // Hide CF7 feedback box temporarily
        const responseOutput = formElm.querySelector('div.wpcf7-response-output');
        if (responseOutput) responseOutput.classList.add('wpcf7cp-force-hide');

        const noTitleDammyStr = 'CF7CfmPlsNoTitle';
        const noTitleOuterHTMLs = [];
        const dispList = {};

        // Parse all input fields in this form
        const inputs = formElm.querySelectorAll('input, select, textarea');
        inputs.forEach(elm => {
            // Skip hidden elements, custom avoids, and buttons
            const style = window.getComputedStyle(elm);
            const isVisible = !!(elm.offsetWidth || elm.offsetHeight || elm.getClientRects().length);
            if (!isVisible || style.visibility === 'hidden' || elm.classList.contains('avoid-confirm')) {
                return;
            }

            const tagName = elm.tagName;
            const type = elm.type;
            const name = elm.getAttribute('name');
            if (!name) return;
            const cleanName = name.replace('[]', '');

            let title = null;
            let val = null;

            if (tagName === 'INPUT') {
                if (['submit', 'button', 'hidden', 'image'].includes(type)) {
                    return;
                }
                if (type === 'radio' || type === 'checkbox') {
                    if (!elm.checked) return;
                    title = wpcf7cp_get_title(elm);
                    val = elm.value;

                    // Translate piped values if defined in localized CF7 pipes map
                    if (val && typeof wpcf7cp_pipes !== 'undefined' && wpcf7cp_pipes[cleanName] && typeof wpcf7cp_pipes[cleanName][val] !== 'undefined') {
                        val = wpcf7cp_pipes[cleanName][val];
                    }

                    // Use the localized check message (configurable site-wide via PHP filter)
                    const checkedMsg = data_arr.checked_msg;

                    if (val === '1' || val === 'on') {
                        val = checkedMsg;
                    } else if (type === 'checkbox') {
                        // Collapse value to checkedMsg if it's a single checkbox (e.g. policy acceptance)
                        // and the value text matches or overlaps the label/title text
                        const siblings = formElm.querySelectorAll(`input[type="checkbox"][name="${elm.name}"]`);
                        if (siblings.length === 1 && title && (title.indexOf(val) !== -1 || val.indexOf(title) !== -1)) {
                            val = checkedMsg;
                        }
                    }
                } else if (type === 'file') {
                    title = wpcf7cp_get_title(elm);
                    val = elm.value.split(PATH_CODE).pop();
                } else {
                    if (elm.classList.contains('wpcf7-quiz')) {
                        return;
                    }
                    title = wpcf7cp_get_title(elm);
                    val = sanitizeText(elm.value);

                    // Translate piped values if defined in localized CF7 pipes map
                    if (val && typeof wpcf7cp_pipes !== 'undefined' && wpcf7cp_pipes[cleanName] && typeof wpcf7cp_pipes[cleanName][val] !== 'undefined') {
                        val = wpcf7cp_pipes[cleanName][val];
                    }
                }
            } else if (tagName === 'TEXTAREA') {
                title = wpcf7cp_get_title(elm);
                val = sanitizeText(elm.value);

                // Translate piped values if defined in localized CF7 pipes map
                if (val && typeof wpcf7cp_pipes !== 'undefined' && wpcf7cp_pipes[cleanName] && typeof wpcf7cp_pipes[cleanName][val] !== 'undefined') {
                    val = wpcf7cp_pipes[cleanName][val];
                }
            } else if (tagName === 'SELECT') {
                title = wpcf7cp_get_title(elm);
                if (elm.multiple) {
                    val = Array.from(elm.selectedOptions).map(opt => opt.value);
                } else {
                    val = elm.value;
                }

                // Translate piped values if defined in localized CF7 pipes map
                if (val && typeof wpcf7cp_pipes !== 'undefined' && wpcf7cp_pipes[cleanName]) {
                    if (Array.isArray(val)) {
                        val = val.map(v => typeof wpcf7cp_pipes[cleanName][v] !== 'undefined' ? wpcf7cp_pipes[cleanName][v] : v);
                    } else if (typeof wpcf7cp_pipes[cleanName][val] !== 'undefined') {
                        val = wpcf7cp_pipes[cleanName][val];
                    }
                }
            }

            // Fallback for unlabeled elements
            if (!title) {
                const parentP = elm.closest('p');
                const outerHTML = parentP ? parentP.outerHTML : '';
                let k = noTitleOuterHTMLs.indexOf(outerHTML);
                if (k === -1 && outerHTML) {
                    noTitleOuterHTMLs.push(outerHTML);
                    k = noTitleOuterHTMLs.length - 1;
                }
                title = noTitleDammyStr + (k !== -1 ? k : 0);
            }

            if (title !== null && val !== null) {
                if (!dispList[title]) {
                    dispList[title] = {
                        values: {},
                        textSet: getTextSet(elm)
                    };
                }
                if (typeof dispList[title]['values'][cleanName] === 'undefined') {
                    dispList[title]['values'][cleanName] = '';
                } else {
                    dispList[title]['values'][cleanName] += splitter;
                }
                dispList[title]['values'][cleanName] += (Array.isArray(val) ? val.join(splitter) : val);
            }
        });

        // Hide input fields form
        formElm.classList.add('wpcf7cp-form-hide');

        // Clear existing confirmation container if any
        const existingCnf = wpcf7Container.querySelector('#wpcf7cpcnf');
        if (existingCnf) existingCnf.remove();

        // Build confirmation layout
        const wrapperDiv = document.createElement('div');
        wrapperDiv.id = 'wpcf7cpcnf';

        const table = document.createElement('table');
        wrapperDiv.appendChild(table);

        for (const key in dispList) {
            let keyToShow = key;
            if (new RegExp('^' + noTitleDammyStr + '[0-9]+$').test(keyToShow)) {
                keyToShow = '';
            }

            const tr = document.createElement('tr');
            const th = document.createElement('th');
            const pTitle = document.createElement('p');
            pTitle.textContent = keyToShow;
            th.appendChild(pTitle);
            tr.appendChild(th);

            const td = document.createElement('td');
            let innerHTML = '';
            if (!dispList[key]['textSet']) {
                let mergedVal = '';
                for (const k in dispList[key]['values']) {
                    if (mergedVal !== '') {
                        mergedVal += splitter;
                    }
                    mergedVal += dispList[key]['values'][k];
                }
                innerHTML = '<p>' + mergedVal + '</p>';
            } else {
                innerHTML = dispList[key]['textSet'];
                for (const k in dispList[key]['values']) {
                    innerHTML = innerHTML.replace(new RegExp('\{%' + k + '%\}', 'g'), String(dispList[key]['values'][k]));
                }
            }
            td.innerHTML = innerHTML;
            tr.appendChild(td);
            table.appendChild(tr);
        }

        // Render back & submit controls
        const btnsDiv = document.createElement('div');
        btnsDiv.className = 'wpcf7cp-btns';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'wpcf7-form-control wpcf7cp-cfm-edit-btn';
        editBtn.textContent = data_arr.cfm_btn_edit;
        editBtn.addEventListener('click', () => {
            wpcf7cp_edit(formElm);
            if (statusInput) statusInput.value = 'status_input';
        });

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'wpcf7-form-control wpcf7-submit wpcf7cp-cfm-submit-btn';
        submitBtn.textContent = data_arr.cfm_btn_mail_send;
        submitBtn.addEventListener('click', () => {
            wpcf7cp_mail_send(formElm);
        });

        btnsDiv.appendChild(editBtn);
        btnsDiv.appendChild(submitBtn);
        wrapperDiv.appendChild(btnsDiv);
        wpcf7Container.appendChild(wrapperDiv);

        // Smooth scroll to top of confirmation box
        const rect = wpcf7Container.getBoundingClientRect();
        const absoluteTop = window.pageYOffset + rect.top;
        const popupHeight = wrapperDiv.offsetHeight;
        const windowHeight = document.documentElement.clientHeight;

        let topOffset = 50;
        if (popupHeight < windowHeight) {
            topOffset = Math.round((windowHeight - popupHeight) / 2);
        }

        window.scrollTo({
            top: absoluteTop - topOffset,
            behavior: 'smooth'
        });
    };

    /**
     * Initializes configuration fields, labels and states.
     */
    const init = function() {
        // Append hidden status parameter if missing
        document.querySelectorAll('input[name="_wpcf7"]').forEach(input => {
            const form = input.closest('form');
            if (form && !form.querySelector('input[name="_wpcf7cp"]')) {
                const hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.name = '_wpcf7cp';
                hidden.value = 'status_input';
                if (input.parentNode) {
                    input.parentNode.insertBefore(hidden, input.nextSibling);
                }
            }
        });

        // Set custom confirmation button labels
        document.querySelectorAll('form.wpcf7-form input.wpcf7-submit').forEach(btn => {
            btn.value = data_arr.cfm_btn;
        });
        document.querySelectorAll('form.wpcf7-form button.wpcf7-submit').forEach(btn => {
            btn.textContent = data_arr.cfm_btn;
        });

        // Store initial form values for resetting later
        document.querySelectorAll('form.wpcf7-form').forEach(form => {
            if (!initialFormValues.has(form)) {
                const values = [];
                form.querySelectorAll('input, select, textarea').forEach(elm => {
                    const name = elm.getAttribute('name');
                    if (name) {
                        if (elm.type === 'checkbox' || elm.type === 'radio') {
                            values.push({ element: elm, checked: elm.checked, type: elm.type });
                        } else {
                            values.push({ element: elm, value: elm.value, type: elm.type });
                        }
                    }
                });
                initialFormValues.set(form, values);
            }
        });
    };

    // Safely trigger initiation on document load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Monitor CF7 submissions globally
    document.addEventListener('wpcf7submit', function(event) {
        if ('wpcf7cp_confirm' === event.detail.status) {
            wpcf7cp_confirm(event.detail.unitTag);
        }
    }, false);

})();
