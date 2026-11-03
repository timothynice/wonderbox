async (page) => {
 const read=()=>page.evaluate(()=>window.__wonderbox.getProject());
 await page.getByRole('button',{name:'Undo (⌘Z)',exact:true}).click();await page.getByRole('button',{name:'Undo (⌘Z)',exact:true}).click();
 if((await read()).entities.filter(e=>e.kind==='star').length!==3)throw Error('AI transaction undo failed');
 if(await page.getByRole('button',{name:'Clear selection',exact:true}).count())await page.getByRole('button',{name:'Clear selection',exact:true}).click();
 await page.getByRole('button',{name:'◕ Pip · garden dreamer',exact:true}).click();const p=await read();await page.getByRole('spinbutton',{name:'Float duration (s)'}).fill('1.2');await page.getByRole('spinbutton',{name:'Float duration (s)'}).press('Tab');await page.waitForFunction(r=>window.__wonderbox.getProject().revision>r,p.revision);
 const before=await read();await page.getByRole('textbox',{name:'Describe your game edit'}).fill('What is Pip current float duration? Do not change anything.');await page.getByRole('button',{name:'Send edit request'}).click();await page.locator('.thinking').waitFor({state:'hidden',timeout:65000});
 const response=await page.locator('.chat').last().textContent();if((await read()).revision!==before.revision||!response.includes('1.2'))throw Error('Agent did not read current manual state: '+response);
 return {report:['undo AI transaction','manual adjustment','live agent reads updated 1.2 second float without mutations'],response};
}
