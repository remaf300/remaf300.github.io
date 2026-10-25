import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Remplace par tes clés Supabase
const SUPABASE_URL = 'https://tzgpkqothjjqmyfykysp.supabase.co/rest/v1/'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Z3BrcW90aGpqcW15ZnlreXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjY2NjksImV4cCI6MjEwODQ0MjY2OX0.iFlzCYX2pZYbDN3380qFZaFlaY4jLf6sQwx5xQMONk0'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log("URL:", SUPABASE_URL);
console.log("KEY:", SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const todosContainer = document.querySelector('.todos-container');    
    const emptyImage = document.querySelector('.empty-image');

    const toggleEmptyState = () => {
        emptyImage.style.display = taskList.children.length === 0 ? 'block' : 'none';
        todosContainer.style.width = taskList.children.length > 0 ? '100%' : '50%';
    }

    // CHARGER LES TÂCHES DEPUIS SUPABASE
    const loadTasksFromSupabase = async () => {
        const { data: tasks, error } = await supabase
            .from('todos')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Erreur lors du chargement :', error);
            return;
        }

        taskList.innerHTML = '';
        tasks.forEach(task => {
            createTaskElement(task.id, task.task, task.completed);
        });
        toggleEmptyState();
    };

    // CRÉER L'ÉLÉMENT HTML D'UNE TÂCHE
    const createTaskElement = (id, text, completed = false) => {
        const li = document.createElement('li');
        li.dataset.id = id; // Stocke l'ID unique de la base de données
        li.innerHTML = `
        <input type="checkbox" class="checkbox" ${completed ? 'checked' : ''} />
        <span>${text}</span>
        <div class="task-buttons">
            <button class="edit-btn"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
        </div>
        `;

        const checkbox = li.querySelector('.checkbox');
        const editBtn = li.querySelector('.edit-btn');

        if(completed) {
            li.classList.add('completed');
            editBtn.disabled = true;
            editBtn.style.opacity  = '0.5';
            editBtn.style.pointerEvents = 'none';
        }

        // Gérer le changement d'état (coché / décoché)
        checkbox.addEventListener('change', async () => {
            const isChecked = checkbox.checked;
            li.classList.toggle('completed', isChecked);
            editBtn.disabled = isChecked;
            editBtn.style.opacity = isChecked ? '0.5' : '1';
            editBtn.style.pointerEvents = isChecked ? 'none' : 'auto';

            // Mettre à jour dans Supabase
            const { error } = await supabase
                .from('todos')
                .update({ completed: isChecked })
                .eq('id', id);

            if (error) console.error('Erreur lors de la mise à jour :', error);
        });

        // Gérer l'édition
        editBtn.addEventListener('click', async () => {
            if(!checkbox.checked){
                taskInput.value = li.querySelector('span').textContent;
                
                // Supprimer de Supabase pour permettre de la recréer modifiée
                const { error } = await supabase
                    .from('todos')
                    .delete()
                    .eq('id', id);

                if (!error) {
                    li.remove();
                    toggleEmptyState();
                } else {
                    console.error('Erreur lors de la suppression pour édition :', error);
                }
            }
        });

        // Gérer la suppression
        li.querySelector('.delete-btn').addEventListener('click', async () => {
            const { error } = await supabase
                .from('todos')
                .delete()
                .eq('id', id);

            if (!error) {
                li.remove();
                toggleEmptyState();
            } else {
                console.error('Erreur lors de la suppression :', error);
            }
        });

        taskList.appendChild(li);
        toggleEmptyState();
    };

    // AJOUTER UNE NOUVELLE TÂCHE
    const addTask = async (text) => {
        const taskText = text || taskInput.value.trim();
        if(!taskText) {
            return;
        }

        // Insérer dans Supabase et récupérer la tâche créée (avec son ID)
        const { data, error } = await supabase
            .from('todos')
            .insert([{ task: taskText, completed: false }])
            .select();

        if (error) {
            console.error('Erreur lors de l\'ajout :', error);
            return;
        }

        if (data && data.length > 0) {
            const newTask = data[0];
            createTaskElement(newTask.id, newTask.task, newTask.completed);
        }

        taskInput.value = '';
    };

    addTaskBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addTask();
    });

    taskInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter'){
            e.preventDefault();
            addTask();
        }
    });

    // Charger les tâches au démarrage
    loadTasksFromSupabase();
});
