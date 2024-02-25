# Valantis test task

Используя предоставленный апи создать страницу, которая отражает список товаров. Для каждого товара должен отображаться его **id, название, цена и бренд.**

-------------

#### Требования:
- выводить по 50 товаров на страницу с возможностью постраничного перехода (пагинация) в обе стороны.
- возможность фильтровать выдачу используя предоставленное апи по названию, цене и бренду

Если API возвращает дубли по id, то следует их считать одним товаром и выводить только первый, даже если другие поля различаются.
Если API возвращает ошибку, следует вывести идентификатор ошибки в консоль, если он есть и повторить запрос.

Пароль для доступа к апи: `Valantis`
API доступно по адресу: http://api.valantis.store:40000/

-------------

#### Форма подачи:
- Выполненное задание разместите на github pages или аналогичном сервисе.
- В сообщении на hh отправить ссылку на сайт и на исходник.

> __*Работы без ссылки на рабочий проект рассматриваться не будут.*__

-------------

#### Комментарии к решению
