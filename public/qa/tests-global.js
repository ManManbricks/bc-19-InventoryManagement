suite('Global Tests', function(){

	test('Checking if page has a valid title', function(){
        

		assert(document.title && document.title.match(/\S/) && document.title.toUpperCase() === 'TODO');
    });
});