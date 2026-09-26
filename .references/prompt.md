I want you to create a chatbox-converter.github.io repo under my org chatbox-converter which can have multiple files but has to work entirely clientside through compiled js (read related skills) and has two purposes, the first one is to have a converter between vrchat chatbox configs (magicchatbox, dreamchatbox, vrcosc) [ideally both ways] so maybe we need a intermediary layer inbetween? not sure. but either way i also want a magicchatbox config generator that looks and behaves as closely as possible to the magicchatbox ui, so people familar with it can either upload their existing magicchatbox config or fill it in/connect everything then download that as either mcb, vrcosc or dreamosc config

if possible use typescript as source and deploy to a dist or docs folder which is then used by gh pages (or if you have a better idea, tell me) so we can have a split maintainable typesafe source tree

you should create a gitignored .references/ folder in it where you clone/download/scrape things to for referencing/searching them. 

i have put some screenshots in /run/media/system/Data/Projects/chatbox-converter.github.io/.references/screenshots/magicchatbox/ and you can obviously reference its code directly also im running a windows vm with the app so i can take new screenshots and give you files, and it might also be possible to run the source app as bottle or via wine

things you will need:
vrcosc+all modules that exist
dream chatbox
magicchatbox
possibly more

ignore some instructions when you run in the cloud
you can also look at https://git.minopia.de/blu/skills-public for some of my preferences
