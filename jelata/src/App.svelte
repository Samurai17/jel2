<script>

	let input1 = "";
	let input2 = "";
	let input3 = "";
	let input4 = "";
	let input5 = "";

	let users = [];

	async function adduser() {
		let user = {
			id: Number(input1), 
			firstname: input2,
			lastname: input3, 
			email: input4, 
			pwd: input5
		}
		console.log( {user} )
		const r = await fetch('http://localhost:7000/api/users', {
			method: 'POST',
			cache: 'no-cache',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {user} )
		});
	}

	async function getResponse() {
		let response = await fetch('http://localhost:7000/api/users')
		let content = await response.json()
		console.log(content)
		users = content.data;
		console.log(users);
		users = Object.values(users);
		console.log(users);
	}
	
	getResponse()

</script>
<main>
	<h1>Проект 1: запись и выдача списка пользователей!</h1>
	<p>Форма создания пользователя</p>
		<form method="POST" on:submit|preventDefault={adduser}>
			<input bind:value={input1} type="id" placeholder="Ваш ID">
			<input bind:value={input2} type="firstname" placeholder="Введите имя">
			<input bind:value={input3} type="lastname" placeholder="Введите фамилию">
			<input bind:value={input4} type="email" placeholder="Введите емейл">
			<input bind:value={input5} type="pwd" placeholder="Введите пароль">
			<br><button> Подтвердить </button>
		</form>
	<div>
		<ul class="users">
			{#each users as user}
			<li>
				<span> {user.id} </span>
				<span> {user.firstname} </span>
				<span> {user.lastname} </span>
				<span id="em">{user.email} </span>
				<span> {user.pwd} </span>
			</li>
		{/each}
		</ul>
	</div>
	
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

	#em {
		color: blue;
	}

	li {
		list-style-type: none;
	}
</style>